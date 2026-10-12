const TRANSLATIONS = {
  en: {
    pageTitle: "Brizall catalogue",
    formTitle: "Get instant access",
    formSub: "Tell us where to reach you",
    nameLabel: "Name",
    namePlaceholder: "Jane Doe",
    emailLabel: "Email",
    emailPlaceholder: "jane@example.com",
    phoneLabel: "Phone number",
    phonePlaceholder: "Phone number",
    continue: "Continue",
    submitting: "Sending…",
    downloadTitle: "Your download is ready",
    thankYou: "Thank you for reaching out! The files are ready when you are.",
    downloadEn: "Download Catalogue (English)",
    downloadEs: "Download Catalogue (Spanish)",
    footNote: "By submitting, you agree to be contacted about this catalogue.",
    errName: "Enter your name.",
    errEmail: "Enter a valid email address.",
    errPhone: "Enter a valid phone number.",
    errSubmit: "We couldn't send your details. Please try again.",
  },
  es: {
    pageTitle: "Catálogo Brizall",
    formTitle: "Obtén acceso inmediato",
    formSub: "Dinos cómo contactarte",
    nameLabel: "Nombre",
    namePlaceholder: "María Pérez",
    emailLabel: "Correo electrónico",
    emailPlaceholder: "maria@ejemplo.com",
    phoneLabel: "Número de teléfono",
    phonePlaceholder: "Número de teléfono",
    continue: "Continuar",
    submitting: "Enviando…",
    downloadTitle: "Tu descarga está lista",
    thankYou: "¡Gracias por contactarnos! Los archivos están listos.",
    downloadEn: "Descargar catálogo (inglés)",
    downloadEs: "Descargar catálogo (español)",
    footNote: "Al enviar, aceptas que te contactemos acerca de este catálogo.",
    errName: "Ingresa tu nombre.",
    errEmail: "Ingresa un correo electrónico válido.",
    errPhone: "Ingresa un número de teléfono válido.",
    errSubmit: "No pudimos enviar tus datos. Inténtalo de nuevo.",
  },
};

const LANG_STORAGE_KEY = "brizall_lang";
let currentLang = "en";

function t(key) {
  return TRANSLATIONS[currentLang][key] || TRANSLATIONS.en[key] || key;
}

function setMessage(element, key) {
  if (key) {
    element.dataset.messageKey = key;
    element.textContent = t(key);
  } else {
    delete element.dataset.messageKey;
    element.textContent = "";
  }
}

function applyLanguage(lang) {
  currentLang = TRANSLATIONS[lang] ? lang : "en";
  document.documentElement.lang = currentLang;
  document.title = t("pageTitle");

  document.querySelectorAll("[data-i18n]").forEach((element) => {
    if (element.classList.contains("btnLabel") && submitBtn.disabled) {
      element.textContent = t("submitting");
    } else {
      element.textContent = t(element.dataset.i18n);
    }
  });

  document.querySelectorAll("[data-i18n-placeholder]").forEach((element) => {
    element.placeholder = t(element.dataset.i18nPlaceholder);
  });

  document.querySelectorAll(".langBtn").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.lang === currentLang));
  });

  document.querySelectorAll("[data-message-key]").forEach((element) => {
    element.textContent = t(element.dataset.messageKey);
  });

  try {
    localStorage.setItem(LANG_STORAGE_KEY, currentLang);
  } catch (err) {
    // Language selection still works when browser storage is unavailable.
  }
}

function getInitialLanguage() {
  try {
    const savedLanguage = localStorage.getItem(LANG_STORAGE_KEY);
    if (TRANSLATIONS[savedLanguage]) return savedLanguage;
  } catch (err) {
    // Fall back to the browser language.
  }
  return (navigator.language || "").toLowerCase().startsWith("es") ? "es" : "en";
}

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
const leadApiUrl = window.BRIZALL_EMAIL_API_URL || "https://brizall.com/api/send-lead.php";

const nameInput = document.getElementById("name");
const emailInput = document.getElementById("email");

const nameError = document.getElementById("nameError");
const emailError = document.getElementById("emailError");
const phoneError = document.getElementById("phoneError");

document.querySelectorAll(".langBtn").forEach((button) => {
  button.addEventListener("click", () => applyLanguage(button.dataset.lang));
});
applyLanguage(getInitialLanguage());

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
  [nameError, emailError, phoneError, formNote].forEach((el) => setMessage(el, null));
  [nameInput, emailInput, phoneInput].forEach((el) =>
    el.classList.remove("invalid")
  );
}

function validate() {
  clearErrors();
  let valid = true;

  if (!nameInput.value.trim()) {
    setMessage(nameError, "errName");
    nameInput.classList.add("invalid");
    valid = false;
  }

  if (!isValidEmail(emailInput.value.trim())) {
    setMessage(emailError, "errEmail");
    emailInput.classList.add("invalid");
    valid = false;
  }

  const phoneOk = iti ? iti.isValidNumber() : isValidPhoneFallback(phoneInput.value);
  if (!phoneOk) {
    setMessage(phoneError, "errPhone");
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
  submitBtn.querySelector(".btnLabel").textContent = t("submitting");

  const payload = {
    name: nameInput.value.trim(),
    email: emailInput.value.trim(),
    phone: iti ? iti.getNumber() : phoneInput.value.trim(),
  };

  try {
    const res = await fetch(leadApiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await res.json().catch(() => ({}));
    if (!res.ok || !result.ok) {
      throw new Error(result.error || "Lead submission failed.");
    }
    formStep.classList.add("hidden");
    downloadStep.classList.remove("hidden");
  } catch (err) {
    console.error(err);
    setMessage(formNote, "errSubmit");
    submitBtn.disabled = false;
    submitBtn.querySelector(".btnLabel").textContent = t("continue");
  }
});
