// ---- Phone input (country code selector) ----
// Wrapped in try/catch so a failed CDN load can't break the whole form.
let iti = null;
const phoneInput = document.querySelector("#phone");

try {
  iti = window.intlTelInput(phoneInput, {
    initialCountry: "auto",
    geoIpLookup: function (callback) {
      fetch("https://ipapi.co/json")
        .then((res) => res.json())
        .then((data) => callback(data.country_code))
        .catch(() => callback("us"));
    },
    utilsScript:
      "https://cdn.jsdelivr.net/npm/intl-tel-input@18.1.1/build/js/utils.js",
  });
} catch (err) {
  console.error("intl-tel-input failed to load, falling back to plain validation:", err);
}

// ---- Elements ----
const form = document.getElementById("leadForm");
const submitBtn = document.getElementById("submitBtn");
const formNote = document.getElementById("formNote");
const formStep = document.getElementById("formStep");
const downloadStep = document.getElementById("downloadStep");

const nameInput = document.getElementById("name");
const emailInput = document.getElementById("email");

const nameError = document.getElementById("nameError");
const emailError = document.getElementById("emailError");
const phoneError = document.getElementById("phoneError");

// ---- Validation ----
function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
}

// Fallback phone check used only if intl-tel-input didn't load
function isValidPhoneFallback(value) {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 7;
}

function clearErrors() {
  [nameError, emailError, phoneError].forEach((el) => (el.textContent = ""));
  [nameInput, emailInput, phoneInput].forEach((el) =>
    el.classList.remove("invalid")
  );
  formNote.textContent = "";
}

function validate() {
  clearErrors();
  let valid = true;

  if (!nameInput.value.trim()) {
    nameError.textContent = "Enter your name.";
    nameInput.classList.add("invalid");
    valid = false;
  }

  if (!isValidEmail(emailInput.value.trim())) {
    emailError.textContent = "Enter a valid email address.";
    emailInput.classList.add("invalid");
    valid = false;
  }

  const phoneOk = iti ? iti.isValidNumber() : isValidPhoneFallback(phoneInput.value);
  if (!phoneOk) {
    phoneError.textContent = "Enter a valid phone number.";
    phoneInput.classList.add("invalid");
    valid = false;
  }

  return valid;
}

// ---- Send submission by email ----
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!validate()) return;

  submitBtn.disabled = true;
  submitBtn.querySelector(".btnLabel").textContent = "Sending…";

  const payload = {
    name: nameInput.value.trim(),
    email: emailInput.value.trim(),
    phone: iti ? iti.getNumber() : phoneInput.value.trim(),
  };

  try {
    const res = await fetch("https://brizall.com/api/send-lead.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await res.json().catch(() => ({}));
    if (!res.ok || !result.ok) {
      throw new Error(result.error || "We couldn't send your details. Please try again.");
    }
    formStep.classList.add("hidden");
    downloadStep.classList.remove("hidden");
  } catch (err) {
    console.error(err);
    formNote.textContent = err.message || "We couldn't send your details. Please try again.";
    submitBtn.disabled = false;
    submitBtn.querySelector(".btnLabel").textContent = "Continue";
  }
});
