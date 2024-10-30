const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");

const app = express();
app.use(cors());
const PORT = 3000;

const db = mysql.createConnection({
  host: "127.0.0.1",
  user: "root",
  password: "root",
  database: "tinder",
  port: 3306,
});

db.connect((err) => {
  if (err) {
    console.error("Erro ao conectar ao banco de dados:", err);
    return;
  }
  console.log("Conectado ao banco de dados MySQL.");
});

app.use(express.json());

app.get("/profiles", (req, res) => {
  db.query("SELECT * FROM Usuarios", (err, result) => {
    if (err) {
      console.error("Erro ao buscar usuários:", err);
      return res.status(500).json({ error: "Erro ao buscar usuários." });
    }
    res.json(
      result.map((user) => ({
        id: user.id_usuario,
        name: user.nome,
        img: user.foto,
      }))
    );
  });
});

app.post("/like", (req, res) => {
  const { id_usuario_origem, id_usuario_destino } = req.body;

  if (!id_usuario_origem || !id_usuario_destino) {
    return res
      .status(400)
      .json({ error: "Os IDs de origem e destino são obrigatórios." });
  }

  const checkReciprocalLikeQuery = `
    SELECT * FROM Likes 
    WHERE id_usuario_origem = ? AND id_usuario_destino = ?
  `;

  db.query(
    checkReciprocalLikeQuery,
    [id_usuario_destino, id_usuario_origem],
    (err, reciprocalLike) => {
      if (err) {
        console.error("Erro ao verificar like recíproco:", err);
        return res
          .status(500)
          .json({ error: "Erro ao verificar like recíproco." });
      }

      const insertLikeQuery = `
      INSERT INTO Likes (id_usuario_origem, id_usuario_destino, data_like) 
      VALUES (?, ?, CURRENT_TIMESTAMP)
    `;
      db.query(
        insertLikeQuery,
        [id_usuario_origem, id_usuario_destino],
        (err) => {
          if (err) {
            console.error("Erro ao registrar like:", err);
            return res.status(500).json({ error: "Erro ao registrar like." });
          }

          if (reciprocalLike.length > 0) {
            const insertMatchQuery = `
          INSERT INTO Matches (id_usuario_1, id_usuario_2, data_match) 
          VALUES (?, ?, CURRENT_TIMESTAMP)
        `;
            db.query(
              insertMatchQuery,
              [id_usuario_origem, id_usuario_destino],
              (err) => {
                if (err) {
                  console.error("Erro ao criar match:", err);
                  return res
                    .status(500)
                    .json({ error: "Erro ao criar match." });
                }

                return res.status(201).json({ message: "Match criado!" });
              }
            );
          } else {
            res.status(201).json({ message: "Like registrado!" });
          }
        }
      );
    }
  );
});

app.post("/register", async (req, res) => {
  const { nome, dataNascimento, email, senha, sexo, telefone } = req.body;

  try {
    db.query("SELECT * FROM Login WHERE email = ?", [email], (err, results) => {
      if (err) {
        console.error("Erro ao verificar o email:", err);
        return res.status(500).json({ error: "Erro no servidor" });
      }

      if (results.length > 0) {
        return res.status(400).json({ error: "Email já está em uso" });
      }

      const idade = calcularIdade(dataNascimento);

      db.query(
        "INSERT INTO Registro (email, senha, metodo_registro) VALUES (?, ?, 'email')",
        [email, senha],
        (err, result) => {
          if (err) {
            console.error("Erro ao inserir login:", err);
            return res.status(500).json({ error: "Erro no servidor" });
          }

          const id_registro = result.insertId;

          db.query(
            "INSERT INTO Usuarios (nome, idade, sexo, telefone, id_registro) VALUES (?, ?, ?, ?, ?)",
            [nome, idade, sexo, telefone, id_registro],
            (err, result) => {
              if (err) {
                console.error("Erro ao inserir o usuário:", err);
                return res.status(500).json({ error: "Erro no servidor" });
              }

              const usuarioId = result.insertId;

              db.query(
                "INSERT INTO Login (id_usuario, email, senha) VALUES (?, ?, ?)",
                [usuarioId, email, senha],
                (err, result) => {
                  if (err) {
                    console.error("Erro ao inserir login:", err);
                    return res.status(500).json({ error: "Erro no servidor" });
                  }

                  const idade = calcularIdade(dataNascimento);
                  res.status(201).json({
                    message: "Usuário registrado com sucesso!",
                    usuario: {
                      nome,
                      idade,
                      sexo,
                      telefone,
                      email,
                    },
                  });
                }
              );
            }
          );
        }
      );
    });
  } catch (error) {
    console.error("Erro no processo de registro:", error);
    res.status(500).json({ error: "Erro no servidor" });
  }
});

app.post("/login", (req, res) => {
  const { email, senha } = req.body;

  db.query(
    "SELECT * FROM Login WHERE email = ? AND senha = ?",
    [email, senha],
    (err, results) => {
      if (err) {
        console.error("Erro ao buscar o usuário:", err);
        return res.status(500).json({ error: "Erro no servidor" });
      }

      if (results.length === 0) {
        return res.status(400).json({ error: "Email ou senha incorretos" });
      }

      const usuario = results[0];

      res.status(200).json({
        message: "Login realizado com sucesso",
        usuario: {
          id: usuario.id_usuario,
          email: usuario.email,
        },
      });
    }
  );
});

app.get("/matches/:userId", (req, res) => {
  const { userId } = req.params;
  db.query(
    `SELECT 
        CASE 
            WHEN m.id_usuario_1 = ? THEN u2.nome 
            ELSE u1.nome 
        END AS nome,
        CASE 
            WHEN m.id_usuario_1 = ? THEN u2.foto 
            ELSE u1.foto 
        END AS foto,
        CASE 
            WHEN m.id_usuario_1 = ? THEN u2.id_usuario 
            ELSE u1.id_usuario 
        END AS id_usuario,
        id_match
    FROM 
        Matches m
    JOIN 
        Usuarios u1 ON m.id_usuario_1 = u1.id_usuario
    JOIN 
        Usuarios u2 ON m.id_usuario_2 = u2.id_usuario
    WHERE 
        m.id_usuario_1 = ? OR m.id_usuario_2 = ?;`,
    [userId, userId, userId, userId, userId],
    (err, results) => {
      if (err) {
        console.error("Erro ao buscar os matches:", err);
        return res.status(500).json({ error: "Erro no servidor" });
      }

      res.json(results);
    }
  );
});

app.post("/messages", (req, res) => {
  const { id_match, id_remetente, id_destinatario, mensagem } = req.body;

  if (!id_match || !id_remetente || !mensagem || !id_destinatario) {
    return res
      .status(400)
      .json({ error: "Os IDs de origem e destino são obrigatórios." });
  }

  db.query(
    "INSERT INTO Mensagens (id_match, id_remetente, id_destinatario, conteudo, data_envio) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)",
    [id_match, id_remetente, id_destinatario, mensagem],
    (err) => {
      if (err) {
        console.error("Erro ao enviar a mensagem:", err);
        return res.status(500).json({ error: "Erro ao enviar a mensagem." });
      }

      res.status(201).json({ message: "Mensagem enviada!" });
    }
  );
});

app.get("/messages/:id_match", (req, res) => {
  const { id_match } = req.params;

  db.query(
    "SELECT * FROM Mensagens WHERE id_match = ?",
    [id_match],
    (err, results) => {
      if (err) {
        console.error("Erro ao buscar as mensagens:", err);
        return res.status(500).json({ error: "Erro no servidor" });
      }

      res.json(results);
    }
  );
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

function calcularIdade(dataNascimento) {
  const hoje = new Date();
  const nascimento = new Date(dataNascimento);
  let idade = hoje.getFullYear() - nascimento.getFullYear();
  const mes = hoje.getMonth() - nascimento.getMonth();
  if (mes < 0 || (mes === 0 && hoje.getDate() < nascimento.getDate())) {
    idade--;
  }
  return idade;
}
