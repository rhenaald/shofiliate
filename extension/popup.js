document.addEventListener("DOMContentLoaded", () => {
  const statusMy = document.getElementById("status-my");
  const statusId = document.getElementById("status-id");

  // Cek Shopee MY
  chrome.runtime.sendMessage(
    { action: "CHECK_AUTH", payload: { region: "MY" } },
    (res) => {
      if (res && res.authenticated) {
        statusMy.textContent = "Login (" + res.user + ")";
        statusMy.className = "badge badge-ok";
      } else {
        statusMy.textContent = "Belum Login";
        statusMy.className = "badge badge-warn";
      }
    }
  );

  // Cek Shopee ID
  chrome.runtime.sendMessage(
    { action: "CHECK_AUTH", payload: { region: "ID" } },
    (res) => {
      if (res && res.authenticated) {
        statusId.textContent = "Login (" + res.user + ")";
        statusId.className = "badge badge-ok";
      } else {
        statusId.textContent = "Belum Login";
        statusId.className = "badge badge-warn";
      }
    }
  );
});
