import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.0/firebase-app.js";
import { 
  getDatabase, 
  ref, 
  push, 
  update, 
  remove, 
  onValue,
  set,
  get 
} from "https://www.gstatic.com/firebasejs/9.6.0/firebase-database.js";
import { 
  getAuth, 
  signInAnonymously, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/9.6.0/firebase-auth.js";

// Configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyC_39HqLYFRB_E8f0jBG6sdF66vpCYPAjw",
  authDomain: "listapeliculas-4171b.firebaseapp.com",
  projectId: "listapeliculas-4171b",
  storageBucket: "listapeliculas-4171b.firebasestorage.app",
  messagingSenderId: "315850886020",
  appId: "1:315850886020:web:590baf81fc8d47d971abd1",
  measurementId: "G-195TQ8CES6"
};

// Inicializa Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);

// Variables globales
let movies = [];
let editKey = null;
let currentUser = null;

// Referencias a elementos del DOM
const loginContainer = document.getElementById('loginContainer');
const appContainer = document.getElementById('appContainer');
const adminLogin = document.getElementById('adminLogin');
const userInfo = document.getElementById('userInfo');
const moviesList = document.getElementById('moviesList');

// Configuración de event listeners
document.addEventListener('DOMContentLoaded', () => {
  // Botones de login
  document.getElementById('pantcookieBtn').addEventListener('click', loginAsPantcookie);
  document.getElementById('adminBtn').addEventListener('click', showAdminLogin);
  document.getElementById('loginAdminBtn').addEventListener('click', loginAsAdmin);
  document.getElementById('logoutBtn').addEventListener('click', logout);
  document.getElementById('registerLink').addEventListener('click', showRegisterForm);
    document.getElementById('forgotPasswordLink').addEventListener('click', sendPasswordReset);
    document.getElementById('registerBtn').addEventListener('click', registerAdmin);
    document.getElementById('backToLoginBtn').addEventListener('click', showLoginForm);
  
  // Búsqueda y filtrado
  document.getElementById('searchBtn').addEventListener('click', searchMovies);
  document.getElementById('filterSelect').addEventListener('change', filterMovies);
  
  // Formulario de películas
  document.getElementById('addMovieBtn').addEventListener('click', validateAndAddMovie);
  document.getElementById('updateBtn').addEventListener('click', updateMovie);
  document.getElementById('cancelBtn').addEventListener('click', cancelEdit);
});

// Función para mostrar el login de administrador
function showAdminLogin() {
    adminLogin.style.display = 'block';
}

// Función para mostrar el formulario de registro
function showRegisterForm(e) {
    e.preventDefault();
    document.getElementById('adminLogin').style.display = 'none';
    document.getElementById('adminRegister').style.display = 'block';
}

// Función para volver al login
function showLoginForm() {
    document.getElementById('adminRegister').style.display = 'none';
    document.getElementById('adminLogin').style.display = 'block';
    document.getElementById('registerError').style.display = 'none';
}

// Función para registrar nuevo administrador
async function registerAdmin() {
    const emailInput = document.getElementById('registerEmail');
    const passwordInput = document.getElementById('registerPassword');
    const confirmInput = document.getElementById('registerConfirm');
    const errorElement = document.getElementById('registerError');
    
    // Resetear errores
    errorElement.style.display = 'none';
    
    // Validación mejorada del email
    const email = emailInput.value.trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
        errorElement.textContent = "Por favor ingrese un email válido (ejemplo: admin@dominio.com)";
        errorElement.style.display = 'block';
        emailInput.focus();
        return;
    }

    // Validación de contraseña
    const password = passwordInput.value;
    if (password.length < 6) {
        errorElement.textContent = "La contraseña debe tener al menos 6 caracteres";
        errorElement.style.display = 'block';
        passwordInput.focus();
        return;
    }

    if (password !== confirmInput.value) {
        errorElement.textContent = "Las contraseñas no coinciden";
        errorElement.style.display = 'block';
        confirmInput.focus();
        return;
    }

    try {
        // 1. Registrar usuario en Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        
        // 2. Guardar datos adicionales en Realtime Database
        await set(ref(db, `admins/${userCredential.user.uid}`), {
            email: email,
            createdAt: new Date().toISOString(),
            isAdmin: true,
            lastLogin: null
        });

        // 3. Mostrar éxito
        alert(`¡Registro exitoso! Bienvenido ${email}`);
        showLoginForm();
        document.getElementById('adminUser').value = email;
        
    } catch (error) {
        console.error("Error completo:", error);
        handleAuthError(error, errorElement);
    }
}

// Función para manejar errores
function handleAuthError(error, errorElement) {
    const errorCode = error.code;
    const errorMessage = error.message;
    
    console.log("Código de error:", errorCode);
    console.log("Mensaje completo:", errorMessage);

    const messages = {
        'auth/invalid-email': 'Formato de email inválido. Use: usuario@dominio.com',
        'auth/email-already-in-use': 'Este email ya está registrado',
        'auth/operation-not-allowed': 'Registro con email no habilitado. Contacte al administrador',
        'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres'
    };

    errorElement.textContent = messages[errorCode] || `Error inesperado: ${errorCode}`;
    errorElement.style.display = 'block';
}

// Función para recuperación de contraseña
async function sendPasswordReset(e) {
    e.preventDefault();
    const email = document.getElementById('adminUser').value.trim();
    const errorElement = document.getElementById('loginError');

    if (!email) {
        errorElement.textContent = "Por favor ingrese su email para recuperar la contraseña";
        errorElement.style.display = 'block';
        return;
    }

    try {
        await sendPasswordResetEmail(auth, email);
        errorElement.textContent = `Se ha enviado un enlace de recuperación a ${email}`;
        errorElement.style.display = 'block';
        errorElement.style.color = 'green';
    } catch (error) {
        console.error("Error al enviar email de recuperación:", error);
        errorElement.textContent = getAuthErrorMessage(error.code);
        errorElement.style.display = 'block';
        errorElement.style.color = '#dc3545';
    }
}

// Función para traducir errores de autenticación
function getAuthErrorMessage(errorCode) {
    const messages = {
        'auth/email-already-in-use': 'El email ya está registrado',
        'auth/invalid-email': 'Email inválido',
        'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres',
        'auth/user-not-found': 'Usuario no encontrado',
        'auth/wrong-password': 'Contraseña incorrecta',
        'auth/too-many-requests': 'Demasiados intentos. Cuenta temporalmente bloqueada'
    };
    return messages[errorCode] || 'Ocurrió un error. Por favor intente nuevamente.';
}

// Función para iniciar sesión como Pantcookie (usuario anónimo)
function loginAsPantcookie() {
    showLoader();
    signInAnonymously(auth)
        .then((userCredential) => {
            currentUser = { type: 'pantcookie', uid: userCredential.user.uid };
            updateUIAfterLogin();
        })
        .catch((error) => {
            hideLoader();
            console.error("Error en login anónimo:", error);
        });
}

// Actualiza tu función loginAsAdmin para usar Firebase Auth
async function loginAsAdmin() {
    showLoader();
    const email = document.getElementById('adminUser').value.trim();
    const password = document.getElementById('adminPass').value.trim();
    const errorElement = document.getElementById('loginError');

    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        
        // Verificar si es administrador (opcional)
        const userRef = ref(db, 'admins/' + userCredential.user.uid);
        onValue(userRef, (snapshot) => {
            if (snapshot.exists() && snapshot.val().isAdmin) {
                currentUser = { type: 'admin', uid: userCredential.user.uid };
                updateUIAfterLogin();
            } else {
                hideLoader();
                signOut(auth);
                errorElement.textContent = "No tiene permisos de administrador";
                errorElement.style.display = 'block';
            }
        });
    } catch (error) {
        hideLoader();
        console.error("Error en login admin:", error);
        errorElement.textContent = getAuthErrorMessage(error.code);
        errorElement.style.display = 'block';
    }
}

// Actualizar UI después del login
function updateUIAfterLogin() {
    showLoader(); // Mostrar loader al iniciar
    
    loginContainer.style.display = 'none';
    appContainer.style.display = 'block';
    userInfo.textContent = `Modo: ${currentUser.type === 'admin' ? 'Administrador' : 'Pantcookie'}`;
    document.getElementById('loginError').style.display = 'none';
    
    // Ocultar loader cuando las películas estén cargadas
    loadMovies();
}

// Función para cerrar sesión
function logout() {
    showLoader();
    auth.signOut()
        .then(() => {
            currentUser = null;
            loginContainer.style.display = 'block';
            appContainer.style.display = 'none';
            adminLogin.style.display = 'none';
            document.getElementById('adminUser').value = '';
            document.getElementById('adminPass').value = '';
            document.getElementById('loginError').style.display = 'none';
            
            // Solo llamar a cancelEdit si el formulario está visible
            if (appContainer.style.display !== 'none') {
                cancelEdit();
            }
        })
        .catch((error) => {
            hideLoader();
            console.error("Error al cerrar sesión:", error);
        });
}

// Función para cargar las películas desde Firebase (versión modular)
function loadMovies() {
    showLoader();
    const moviesRef = ref(db, 'movies');
    
    onValue(moviesRef, (snapshot) => {
        movies = [];
        moviesList.innerHTML = '';
        
        snapshot.forEach((childSnapshot) => {
            const movie = childSnapshot.val();
            movie.key = childSnapshot.key;
            movies.push(movie);
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${movie.date}</td>
                <td>${movie.name}</td>
                <td>${movie.user}</td>
                <td>${movie.watched ? 'Sí' : 'No'}</td>
                <td class="action-buttons">
                    <button class="edit-btn" data-key="${movie.key}">Editar</button>
                    <button class="delete-btn" data-key="${movie.key}">Eliminar</button>
                </td>
            `;
            moviesList.appendChild(row);
        });
        
        // Agrega event listeners a los botones dinámicos
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                if (currentUser && currentUser.type === 'admin') {
                    editMovie(e.target.dataset.key);
                } else {
                    showAccessDenied();
                }
            });
        });
        
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                if (currentUser && currentUser.type === 'admin') {
                    if (confirm('¿Estás seguro de eliminar esta película?')) {
                        deleteMovie(e.target.dataset.key);
                    }
                } else {
                    showAccessDenied();
                }
            });
        });
        
        document.getElementById('actionsHeader').style.display = 'table-cell';
        hideLoader();
    },);
}

// Función para validar y agregar una nueva película
function validateAndAddMovie() {
    const movieName = document.getElementById('movieName').value.trim();
    const userName = document.getElementById('userName').value.trim();
    const movieNameError = document.getElementById('movieNameError');
    const userNameError = document.getElementById('userNameError');
    
    // Resetear mensajes de error
    movieNameError.style.display = 'none';
    userNameError.style.display = 'none';
    
    // Validaciones
    if (!movieName) {
        movieNameError.style.display = 'block';
        return;
    }
    
    if (!userName) {
        userNameError.style.display = 'block';
        return;
    }
    
    // Si pasa las validaciones, agregar la película
    addMovie();
}

// Función para agregar una nueva película a Firebase
function addMovie() {
    showLoader();
    const movieName = document.getElementById('movieName').value.trim();
    const userName = document.getElementById('userName').value.trim();
    const watched = document.getElementById('watched').value === 'true';
    const now = new Date();
    const dateTime = now.toLocaleString();
    
    const newMovieRef = push(ref(db, 'movies'));
    
    set(newMovieRef, {
        date: dateTime,
        name: movieName,
        user: userName,
        watched: watched,
        addedBy: currentUser ? currentUser.uid : 'anonymous'
    })
    .then(() => {
        hideLoader();
        document.getElementById('movieForm').reset();
    })
    .catch((error) => {
        hideLoader();
        addEventListenersToButtons();
        console.error("Error al agregar película:", error);
        alert("Error al agregar película: " + error.message);
    });
}

// Función para eliminar una película
function deleteMovie(movieKey) {
    if (!currentUser || currentUser.type !== 'admin') {
        showAccessDenied();
        return;}
    
    if (confirm('¿Estás seguro de que quieres eliminar esta película?')) {
        showLoader();
        remove(ref(db, `movies/${movieKey}`))
            .then(() => {
                hideLoader();
                console.log("Película eliminada con éxito");
            })
            .catch((error) => {
                hideLoader();
                console.error("Error al eliminar película:", error);
                alert("Error al eliminar película: " + error.message);
            });
    }
}

// Función para editar una película
async function editMovie(movieKey) {
    if (!currentUser || currentUser.type !== 'admin') {
        showAccessDenied();
        return;
    }
    showLoader();
    try {
        const snapshot = await get(ref(db, `movies/${movieKey}`));
        
        if (!snapshot.exists()) {
            hideLoader();
            console.log("No se encontró la película");
            return;
        }

        const movie = snapshot.val();
        
        // Actualizar UI
        document.getElementById('movieName').value = movie.name || '';
        document.getElementById('userName').value = movie.user || '';
        document.getElementById('watched').value = movie.watched ? 'true' : 'false';
        
        // Ocultar errores
        document.getElementById('movieNameError').style.display = 'none';
        document.getElementById('userNameError').style.display = 'none';
        
        // Mostrar botones de edición
        document.getElementById('updateBtn').style.display = 'inline-block';
        document.getElementById('cancelBtn').style.display = 'inline-block';
        document.getElementById('addMovieBtn').style.display = 'none';
        
        editKey = movieKey;
        hideLoader();

    } catch (error) {
        hideLoader();
        console.error("Error al editar película:", error);
        alert(`Error al cargar película: ${error.message}`);
    }
}

// Función para actualizar una película
function updateMovie() {
    if (!editKey || !currentUser || currentUser.type !== 'admin') return;
    
    showLoader();
    const movieName = document.getElementById('movieName').value.trim();
    const userName = document.getElementById('userName').value.trim();
    const watched = document.getElementById('watched').value === 'true';
    const now = new Date();
    const dateTime = now.toLocaleString();
    
    update(ref(db, `movies/${editKey}`), {
        date: dateTime,
        name: movieName,
        user: userName,
        watched: watched
    })
    .then(() => {
        hideLoader();
        cancelEdit();
    })
    .catch((error) => {
        hideLoader();
        console.error("Error al actualizar película:", error);
        alert("Error al actualizar película: " + error.message);
    });
}

// Función cancelEdit (actualizada con verificaciones)
function cancelEdit() {
    const movieForm = document.getElementById('movieForm');
    if (!movieForm) return;  // Salir si el formulario no existe
    
    const movieNameError = document.getElementById('movieNameError');
    const userNameError = document.getElementById('userNameError');
    const updateBtn = document.getElementById('updateBtn');
    const cancelBtn = document.getElementById('cancelBtn');
    const addMovieBtn = document.querySelector('#movieForm button:first-child');
    
    // Verificar que los elementos existan antes de manipularlos
    if (movieForm) movieForm.reset();
    if (movieNameError) movieNameError.style.display = 'none';
    if (userNameError) userNameError.style.display = 'none';
    if (updateBtn) updateBtn.style.display = 'none';
    if (cancelBtn) cancelBtn.style.display = 'none';
    if (addMovieBtn) addMovieBtn.style.display = 'inline-block';
    
    editKey = null;
}

// Función para buscar películas (ahora filtra localmente)
function searchMovies() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    
    if (!searchTerm) {
        loadMovies(); // Recargar todas las películas
        return;
    }
    
    const rows = moviesList.getElementsByTagName('tr');
    
    for (let row of rows) {
        const cells = row.getElementsByTagName('td');
        let shouldShow = false;
        
        if (cells.length > 1) {
            const movieName = cells[1].textContent.toLowerCase();
            const userName = cells[2].textContent.toLowerCase();
            
            if (movieName.includes(searchTerm) || userName.includes(searchTerm)) {
                shouldShow = true;
            }
        }
        
        row.style.display = shouldShow ? '' : 'none';
    }
}

// Función para filtrar películas (filtrado local)
function filterMovies() {
    const filterValue = document.getElementById('filterSelect').value;
    const tbody = document.querySelector('#moviesList');
    
    // Limpiar la tabla antes de aplicar filtros
    tbody.innerHTML = '';

    // Clonar el array original para no modificarlo
    let filteredMovies = [...movies];

    // Aplicar filtros
    switch(filterValue) {
        case 'date_asc':
            filteredMovies.sort((a, b) => new Date(a.date) - new Date(b.date));
            break;
        case 'date_desc':
            filteredMovies.sort((a, b) => new Date(b.date) - new Date(a.date));
            break;
        case 'watched':
            filteredMovies = filteredMovies.filter(movie => movie.watched);
            break;
        case 'not_watched':
            filteredMovies = filteredMovies.filter(movie => !movie.watched);
            break;
        case 'movie_asc':
            filteredMovies.sort((a, b) => a.name.localeCompare(b.name));
            break;
        case 'movie_desc':
            filteredMovies.sort((a, b) => b.name.localeCompare(a.name));
            break;
        case 'user_asc':
            filteredMovies.sort((a, b) => a.user.localeCompare(b.user));
            break;
        case 'user_desc':
            filteredMovies.sort((a, b) => b.user.localeCompare(a.user));
            break;
        default:
            // No filtrar, mostrar todo
            break;
    }

    // Renderizar películas filtradas
    filteredMovies.forEach(movie => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${movie.date}</td>
            <td>${movie.name}</td>
            <td>${movie.user}</td>
            <td>${movie.watched ? 'Sí' : 'No'}</td>
            <td class="action-buttons">
                <button class="edit-btn" data-key="${movie.key}">Editar</button>
                <button class="delete-btn" data-key="${movie.key}">Eliminar</button>
            </td>
        `;
        tbody.appendChild(row);
    });
    
    // Reorganizar las filas en la tabla
    addEventListenersToButtons();
}

// Escuchar cambios en la autenticación
auth.onAuthStateChanged((user) => {
    if (user) {
        // Usuario ya está logueado
        if (user.isAnonymous) {
            currentUser = { type: 'pantcookie', uid: user.uid };
        } else {
            currentUser = { type: 'admin', uid: user.uid };
        }
        updateUIAfterLogin();
    } else {
        // No hay usuario logueado
        currentUser = null;
        loginContainer.style.display = 'block';
        appContainer.style.display = 'none';
    }
});

// Función para mostrar el modal de acceso denegado
function showAccessDenied(message = "Acceso denegado: No tienes permisos de administrador") {
    const modal = document.getElementById('accessDeniedModal');
    const messageElement = document.getElementById('accessDeniedMessage');
    
    messageElement.textContent = message;
    modal.style.display = 'block';
    
    // Cerrar modal al hacer clic en la X
    document.querySelector('.close-modal').onclick = () => {
        modal.style.display = 'none';
    };
    
    // Cerrar modal al hacer clic en Entendido
    document.getElementById('understandBtn').onclick = () => {
        modal.style.display = 'none';
    };
    
    // Cerrar al hacer clic fuera del modal
    window.onclick = (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    };
}

// ==================== FUNCIONES DEL LOADER ====================
function showLoader() {
  if (loaderContainer) loaderContainer.style.display = 'flex';
}

function hideLoader() {
  if (loaderContainer) loaderContainer.style.display = 'none';
}

function addEventListenersToButtons() {
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            if (currentUser && currentUser.type === 'admin') {
                editMovie(e.target.dataset.key);
            } else {
                showAccessDenied();
            }
        });
    });

    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            if (currentUser && currentUser.type === 'admin') {
                if (confirm('¿Estás seguro de eliminar esta película?')) {
                    deleteMovie(e.target.dataset.key);
                }
            } else {
                showAccessDenied();
            }
        });
    });
}

// Inicialización
document.addEventListener('DOMContentLoaded', function() {
    // Verificar si hay un usuario logueado (manejado por onAuthStateChanged)
});