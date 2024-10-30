window.addEventListener("load", () => {
  const userCurrent = localStorage.getItem("user");

  if (!userCurrent) {
    window.open("PaginaLogin.html", "_self");
  }
});

function showPage(page) {
  let content = document.getElementById("content");
  if (page === "like-dislike") {
    content.innerHTML = `
            <div class="container">
                <div class="card">
                    <img src="https://via.placeholder.com/150" alt="Profile Picture">
                    <h2 id="profile-name">Nome da Pessoa</h2>
                </div>
                <div class="actions">
                    <button id="dislikeBtn" class="dislike">X</button>
                    <button id="likeBtn" class="like">❤️</button>
                </div>
                <div id="match-notification" class="notification hidden">
                    <p>Vocês deram um match!</p>
                </div>
            </div>
        `;
    initializeLikeDislike();
  } else if (page === "chat") {
    content.innerHTML =
      '<h1>Bate papo</h1><div class="chat-container" id="chat-container"></div>';
    updateChat();
  } else if (page === "profile") {
    alert("Estamos trabalhando nisso! :)");
    // content.innerHTML = fetch("perfil.html")
    //   .then((response) => response.text())
    //   .then((data) => {
    //     content.innerHTML = data;
    //     const uploadIcon = document.getElementById("uploadIcon");
    //     const fileInput = document.getElementById("fileInput");
    //     const preview = document.getElementById("preview");
    //     const userInfo = document.getElementById("userInfo");
    //     const saveButton = document.getElementById("saveButton");

    //     uploadIcon.addEventListener("click", () => {
    //       fileInput.click();
    //     });

    //     fileInput.addEventListener("change", (event) => {
    //       const file = event.target.files[0];

    //       if (file) {
    //         const reader = new FileReader();

    //         reader.onload = function (e) {
    //           preview.src = e.target.result;
    //           preview.style.display = "block";
    //         };

    //         reader.readAsDataURL(file);
    //       }
    //     });

    //     saveButton.addEventListener("click", () => {
    //       const infoText = userInfo.value;
    //       alert("Informações salvas: " + infoText);
    //     });
    //   });
  } else if (page.includes("messages")) {
    const matchId = page.split("-")[1];

    function updateMessages(matchId) {
      fetch("http://127.0.0.1:3000/messages/" + matchId, {
        method: "GET",
      })
        .then((response) => response.json())
        .then((messages) => {
          const messageContainer = document.getElementById("message-container");
          const messageInput = document.getElementById("message-input");
          messageContainer.innerHTML = "";

          messages.map((message) => {
            const messageElement = document.createElement("div");
            messageElement.classList.add("message");
            if (
              message.id_destinatario ===
              JSON.parse(localStorage.getItem("user")).id
            ) {
              messageElement.classList.add("sent");
            } else {
              messageElement.classList.add("received");
            }
            messageElement.textContent = message.conteudo;
            messageContainer.appendChild(messageElement);
            messageInput.value = "";
          });
        });
    }

    function sendMessage(matchId) {
      const profileId = page.split("-")[2];
      const messageInput = document.getElementById("message-input");
      const userIdCurrent = JSON.parse(localStorage.getItem("user")).id;

      if (!messageInput.value) {
        alert("Digite uma mensagem!");
        return;
      }

      fetch("http://127.0.0.1:3000/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id_match: matchId,
          id_remetente: profileId,
          id_destinatario: userIdCurrent,
          mensagem: messageInput.value,
        }),
      }).then(() => {
        updateMessages(matchId);
      });
    }

    content.innerHTML = `
    <h1 'nome-usuario'></h1>
    <div class="message-container" id="message-container"></div>
    <div style="display: flex; flex-direction: column; gap: 15px;">
      <textarea id="message-input" placeholder="Digite sua mensagem"></textarea>
      <button id="send-message">Enviar</button>
    </div>
    `;

    const sendMessageButtoon = document.getElementById("send-message");
    sendMessageButtoon.addEventListener("click", () => {
      sendMessage(matchId);
    });

    updateMessages(matchId);
  } else if (page === "logout") {
    localStorage.removeItem("user");
    window.open("PaginaLogin.html", "_self");
  }
}

function initializeLikeDislike() {
  const likeBtn = document.getElementById("likeBtn");
  const dislikeBtn = document.getElementById("dislikeBtn");
  const matchNotification = document.getElementById("match-notification");
  const profileName = document.getElementById("profile-name");
  const profileImg = document.querySelector(".card img");

  fetch("http://127.0.0.1:3000/profiles", {
    method: "GET",
  })
    .then((response) => response.json())
    .then((profilesRes) => {
      const userIdCurrent = JSON.parse(localStorage.getItem("user")).id;

      fetch(`http://127.0.0.1:3000/matches/${userIdCurrent}`, {
        method: "GET",
      })
        .then((response) => response.json())
        .then((matches) => {
          profilesRes = profilesRes.filter((profile) => {
            return !matches.some((match) => match.id_usuario === profile.id);
          });

          const profiles = profilesRes.filter(
            (profile) => profile.id !== userIdCurrent
          );
          let currentProfileIndex = 0;

          function updateProfile() {
            if (profiles.length > 0) {
              const profile = profiles[currentProfileIndex];
              profileName.textContent = profile.name;
              profileImg.src = profile.img ?? "img/profile-default.png";
            } else {
              profileName.textContent = "Nenhum perfil disponível";
              profileImg.src = "https://via.placeholder.com/150";
            }
          }

          updateProfile();

          likeBtn.addEventListener("click", () => {
            const id_usuario_origem = userIdCurrent;
            const id_usuario_destino = profiles[currentProfileIndex].id;

            fetch("http://127.0.0.1:3000/like", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ id_usuario_origem, id_usuario_destino }),
            })
              .then((response) => response.json())
              .then((data) => {
                if (data.isMatch) {
                  isMatched = true;
                  matchNotification.classList.remove("hidden");
                  matchNotification.classList.add("visible");
                  matchedProfiles.push(profiles[currentProfileIndex]);
                  profiles.splice(currentProfileIndex, 1);

                  setTimeout(() => {
                    matchNotification.classList.remove("visible");
                    matchNotification.classList.add("hidden");
                    isMatched = false;
                    likeCount = 0;
                    updateProfile();
                  }, 1500);
                } else {
                  currentProfileIndex =
                    (currentProfileIndex + 1) % profiles.length;
                  updateProfile();
                }
              })
              .catch((error) => console.error("Erro ao enviar o like:", error));
          });

          dislikeBtn.addEventListener("click", () => {
            currentProfileIndex = (currentProfileIndex + 1) % profiles.length;
            updateProfile();
          });
        });
    })
    .catch((error) => console.error("Erro ao enviar o like:", error));
}

function updateChat() {
  const chatContainer = document.getElementById("chat-container");
  chatContainer.innerHTML = "";
  const userIdCurrent = JSON.parse(localStorage.getItem("user")).id;

  fetch(`http://127.0.0.1:3000/matches/${userIdCurrent}`, {
    method: "GET",
  })
    .then((response) => response.json())
    .then((matches) => {
      matches.map((match) => {
        const profileElement = document.createElement("div");
        profileElement.style = "cursor: pointer";
        profileElement.classList.add("chat-profile");
        profileElement.innerHTML = `
            <img src="${
              match.foto ?? "img/profile-default.png"
            }" alt="Profile Picture">
            <p>${match.nome}</p>
        `;

        profileElement.addEventListener("click", () => {
          showPage(`messages-${match.id_match}-${match.id_usuario}`);
        });
        chatContainer.appendChild(profileElement);
      });
    });
}
