// Firebase Authentication + Firestore
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

//Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyC2efvQ6tmMwWaXuwxxb9Dzn5acKTOXWm0",
  authDomain: "weatherapp-11faa.firebaseapp.com",
  projectId: "weatherapp-11faa",
  storageBucket: "weatherapp-11faa.appspot.com",
  messagingSenderId: "360480906515",
  appId: "1:360480906515:web:97b6dbfc4663b30783cee6"
};

//Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

//Elements
const authModal = document.getElementById("authModal");
const loginBtn = document.getElementById("loginBtn");
const signupBtn = document.getElementById("signupBtn");
const closeAuth = document.getElementById("closeAuth");
const authTitle = document.getElementById("authTitle");
const authSubmit = document.getElementById("authSubmit");
const authUsername = document.getElementById("authUsername");
const authEmail = document.getElementById("authEmail");
const authPassword = document.getElementById("authPassword");
const authRepeatPassword = document.getElementById("authRepeatPassword");
const logoutBtn = document.getElementById("logoutBtn");
const userInfo = document.getElementById("userInfo");
const userName = document.getElementById("userName");

const addFavoriteBtn = document.getElementById("addFavoriteBtn");
const favoriteSelect = document.getElementById("favoriteSelect");

let isSignUp = false;
let favoriteCities = [];
let searchHistory = [];
let currCity = ""; 

//SHOW/HIDE MODAL
loginBtn.addEventListener("click", () => {
  authModal.style.display = "flex";
  isSignUp = false;
  authTitle.textContent = "Log In";
  authUsername.style.display = "none";
  authRepeatPassword.style.display = "none";
});

signupBtn.addEventListener("click", () => {
  authModal.style.display = "flex";
  isSignUp = true;
  authTitle.textContent = "Sign Up";
  authUsername.style.display = "block";
  authRepeatPassword.style.display = "block";
});

closeAuth.addEventListener("click", () => authModal.style.display = "none");
window.addEventListener("click", (event) => {
  if (event.target === authModal) authModal.style.display = "none";
});

//SIGN UP / LOGIN
authSubmit.addEventListener("click", async () => {
  const email = authEmail.value.trim();
  const password = authPassword.value.trim();

  if (isSignUp) {
    const username = authUsername.value.trim();
    const repeatPassword = authRepeatPassword.value.trim();

    if (!username || !email || !password || !repeatPassword) {
      alert("Please fill in all fields.");
      return;
    }
    if (password !== repeatPassword) {
      alert("Passwords do not match!");
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Save user info in Firestore
      await setDoc(doc(db, "users", user.uid), {
        username: username,
        email: email,
        favoriteCities: [],
        searchHistory: [],
        loginTime: new Date().toISOString(),
      });

      alert("Account created successfully!");
      authModal.style.display = "none";
    } catch (error) {
      alert(error.message);
    }
  } else {
    // LOGIN
    if (!email || !password) {
      alert("Please enter your email and password.");
      return;
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Update login time
      await updateDoc(doc(db, "users", user.uid), {
        loginTime: new Date().toISOString()
      });

      authModal.style.display = "none";
      alert("Logged in successfully!");
    } catch (error) {
      alert(error.message);
    }
  }
});

//AUTH STATE CHANGE
onAuthStateChanged(auth, async (user) => {
  if (user) {
    loginBtn.style.display = "none";
    signupBtn.style.display = "none";
    userInfo.classList.remove("hidden");

    const docRef = doc(db, "users", user.uid);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      userName.textContent = data.username || user.email;

      // Load favorites from Firestore
      favoriteCities = data.favoriteCities || [];
      updateFavoriteDropdown();
    } else {
      userName.textContent = user.email;
      favoriteCities = [];
    }
  } else {
    loginBtn.style.display = "inline-block";
    signupBtn.style.display = "inline-block";
    userInfo.classList.add("hidden");

    // Load favorites from localStorage for guests
    favoriteCities = JSON.parse(localStorage.getItem("favoriteCities")) || [];
    updateFavoriteDropdown();
  }
});

//ADD/REMOVE FAVORITE
addFavoriteBtn.addEventListener("click", async () => {
  // Take the exact city string from the suggestion (or main screen)
  const cityOnScreen = document.querySelector(".weather__city span").textContent.trim();
  if (!cityOnScreen) return;

  // Toggle favorite
  if (favoriteCities.includes(cityOnScreen)) {
    favoriteCities = favoriteCities.filter(c => c !== cityOnScreen);
  } else {
    favoriteCities.push(cityOnScreen);
  }

  // Save locally
  localStorage.setItem("favoriteCities", JSON.stringify(favoriteCities));

  // Save to Firestore if logged in
  const user = auth.currentUser;
  if (user) {
    try {
      await updateDoc(doc(db, "users", user.uid), { favoriteCities });
    } catch (err) {
      console.error("Error updating favorites in Firestore:", err);
    }
  }

  updateFavoriteDropdown();
  updateFavoriteButton();
});

//UPDATE FAVORITE DROPDOWN
function updateFavoriteDropdown() {
  favoriteSelect.innerHTML = `<option value="">⭐ Favorite Cities</option>`;
  favoriteCities.forEach(city => {
    const option = document.createElement("option");
    option.value = city; // save full suggestion string
    option.textContent = city;
    favoriteSelect.appendChild(option);
  });

  if (currCity && favoriteCities.includes(currCity)) {
    favoriteSelect.value = currCity;
  }
}

//UPDATE STAR BUTTON VISUAL
function updateFavoriteButton() {
  if (!currCity) {
    addFavoriteBtn.textContent = "☆";
    return;
  }
  addFavoriteBtn.textContent = favoriteCities.includes(currCity) ? "★" : "☆";
}

//FAVORITE DROPDOWN CHANGE
favoriteSelect.addEventListener("change", async (e) => {
  const selectedCity = e.target.value;
  if (!selectedCity) return;

  currCity = selectedCity;
  updateFavoriteButton();

  try {
    // Use the full suggestion name to get coordinates
    const geoRes = await fetch(
      `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(selectedCity)}&limit=1&appid=${API_KEYS.openweather}`
    );
    const geoData = await geoRes.json();
    if (!geoData || geoData.length === 0) {
      alert("City not found!");
      return;
    }

    const { lat, lon } = geoData[0];

    // Fetch weather by coordinates
    await getWeatherByCoords(lat, lon, selectedCity);

  } catch (err) {
    console.error("Error loading favorite city:", err);
    alert("Failed to load weather for " + selectedCity);
  }
});

//LOAD FAVORITES ON LOGIN/START
async function loadFavorites() {
  const user = auth.currentUser;
  if (user) {
    try {
      const docSnap = await getDoc(doc(db, "users", user.uid));
      favoriteCities = docSnap.exists() ? docSnap.data().favoriteCities || [] : [];
    } catch {
      favoriteCities = [];
    }
  } else {
    favoriteCities = JSON.parse(localStorage.getItem("favoriteCities")) || [];
  }

  updateFavoriteDropdown();
  updateFavoriteButton();
}


//INIT
onAuthStateChanged(auth, () => loadFavorites());
window.addEventListener("DOMContentLoaded", () => loadFavorites());
//LOGOUT
logoutBtn.addEventListener("click", async () => {
  await signOut(auth);
  alert("👋 Logged out successfully!");
});