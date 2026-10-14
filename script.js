// =============================================================
// SISTEM PEMINJAMAN BUKU PERPUSTAKAAN
// Frontend Client + JWT Authentication
// Backend: http://localhost:3000
// =============================================================

const BOOK_SERVICE_URL = '';
const BORROW_SERVICE_URL = '';

// ─── SESSION STORAGE HELPERS ─────────────────────────────────

function getSession() {
    try {
        const stored = localStorage.getItem('lib_session');
        return stored ? JSON.parse(stored) : null;
    } catch (error) {
        localStorage.removeItem('lib_session');
        return null;
    }
}

function saveSession(user) {
    localStorage.setItem('lib_session', JSON.stringify(user));
}

function clearSession() {
    localStorage.removeItem('lib_session');
}

// Header untuk request API yang membutuhkan autentikasi
function authHeaders() {
    const session = getSession();

    return {
        'Content-Type': 'application/json',
        ...(session?.token
            ? { 'Authorization': `Bearer ${session.token}` }
            : {})
    };
}

// ─── AUTENTIKASI JWT ─────────────────────────────────────────

async function login() {
    const nim = document.getElementById('nim').value.trim();
    const password = document.getElementById('password').value;
    const errDiv = document.getElementById('loginError');

    errDiv.style.display = 'none';

    if (!nim || !password) {
        showError(errDiv, '⚠️ NIM dan Password tidak boleh kosong.');
        return;
    }

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ nim, password })
        });

        const data = await response.json();

        if (!response.ok) {
            showError(
                errDiv,
                data.message || 'NIM atau Password salah.'
            );
            return;
        }

        if (!data.token || !data.user) {
            showError(errDiv, 'Respons login tidak memiliki token JWT.');
            return;
        }

        const user = {
            nim: data.user.nim,
            name: data.user.name,
            token: data.token
        };

        saveSession(user);
        showMainPage(user);

    } catch (error) {
        console.error('Login error:', error);
        showError(
            errDiv,
            '⚠️ Tidak dapat terhubung ke backend. Pastikan server berjalan.'
        );
    }
}

function logout() {
    clearSession();
    showLoginPage();
}

function showError(element, message) {
    element.textContent = message;
    element.style.display = 'block';
}

// ─── NAVIGASI ────────────────────────────────────────────────

function showLoginPage() {
    document.getElementById('loginSection').style.display = 'flex';
    document.getElementById('mainSection').style.display = 'none';
    document.getElementById('nim').value = '';
    document.getElementById('password').value = '';
    document.getElementById('loginError').style.display = 'none';
}

function showMainPage(user) {
    document.getElementById('loginSection').style.display = 'none';
    document.getElementById('mainSection').style.display = 'block';

    document.getElementById('userNameDisplay').textContent =
        `👤 ${user.name} — NIM ${user.nim}`;

    checkServicesHealth();
    renderAll();
}

// ─── HEALTH CHECK ────────────────────────────────────────────

async function checkServicesHealth() {
    const bookStatus = document.getElementById('statusBookService');
    const borrowStatus = document.getElementById('statusBorrowService');

    try {
        const response = await fetch('/health');

        if (response.ok) {
            if (bookStatus) {
                bookStatus.innerHTML =
                    '<span class="dot-online"></span> Backend API (3000)';
            }
            if (borrowStatus) {
                borrowStatus.innerHTML =
                    '<span class="dot-online"></span> Backend API (3000)';
            }
        } else {
            throw new Error('Backend tidak tersedia');
        }
    } catch (error) {
        if (bookStatus) {
            bookStatus.innerHTML =
                '<span class="dot-offline"></span> Backend Offline';
        }
        if (borrowStatus) {
            borrowStatus.innerHTML =
                '<span class="dot-offline"></span> Backend Offline';
        }
    }
}

// ─── API CLIENT CALLS ────────────────────────────────────────

async function fetchBooks() {
    const response = await fetch('/api/books', {
        headers: authHeaders()
    });

    if (response.status === 401 || response.status === 403) {
        handleExpiredSession();
        throw new Error('Sesi tidak valid. Silakan login kembali.');
    }

    if (!response.ok) {
        throw new Error('Gagal memuat katalog buku.');
    }

    return await response.json();
}

async function fetchUserBorrowings(nim) {
    const response = await fetch(
        `${BORROW_SERVICE_URL}/api/borrowings/${encodeURIComponent(nim)}`,
        { headers: authHeaders() }
    );

    if (response.status === 401 || response.status === 403) {
        handleExpiredSession();
        throw new Error('Sesi tidak valid. Silakan login kembali.');
    }

    if (!response.ok) {
        throw new Error('Gagal memuat data peminjaman.');
    }

    return await response.json();
}

function handleExpiredSession() {
    clearSession();
    showLoginPage();
}

// ─── RENDER UTAMA ────────────────────────────────────────────

async function renderAll() {
    const session = getSession();
    if (!session) return;

    checkServicesHealth();

    try {
        const [books, borrowings] = await Promise.all([
            fetchBooks(),
            fetchUserBorrowings(session.nim)
        ]);

        const userActiveBorrowings = borrowings.filter(
            borrowing => borrowing.status === 'active'
        );

        renderActiveBorrowings(userActiveBorrowings, books);
        renderBooks(books, userActiveBorrowings);

    } catch (error) {
        console.error('Error fetching data:', error);

        const activeEl = document.getElementById('activeBorrowings');
        const bookEl = document.getElementById('bookList');

        if (activeEl) {
            activeEl.innerHTML =
                `<p class="empty-msg" style="color:#e53e3e;">⚠️ ${error.message}</p>`;
        }

        if (bookEl) {
            bookEl.innerHTML =
                '<p class="empty-msg" style="color:#e53e3e;">Gagal memuat daftar buku.</p>';
        }
    }
}

// ─── RENDER PEMINJAMAN AKTIF ─────────────────────────────────

function renderActiveBorrowings(userBorrowings, books) {
    const container = document.getElementById('activeBorrowings');

    if (!userBorrowings || userBorrowings.length === 0) {
        container.innerHTML =
            '<p class="empty-msg">📭 Belum ada peminjaman aktif. Silakan pilih buku di bawah.</p>';
        return;
    }

    const isFull = userBorrowings.length >= 3;
    const today = new Date();

    let html = `
      <div class="borrow-counter ${isFull ? 'full' : 'ok'}">
          📚 ${userBorrowings.length} / 3 buku sedang dipinjam
          ${isFull ? ' — <em>Batas maksimal tercapai!</em>' : ''}
      </div>
      <div class="table-wrapper">
      <table class="table">
        <thead>
          <tr>
            <th>#</th>
            <th>Judul Buku</th>
            <th>Tanggal Pinjam</th>
            <th>Jatuh Tempo (7 hari)</th>
            <th>Status</th>
            <th>Aksi</th>
          </tr>
        </thead>
        <tbody>`;

    userBorrowings.forEach((borrowing, index) => {
        const book = books.find(item => item.id === borrowing.bookId);
        const dueDate = new Date(borrowing.dueDate);
        const isOverdue = dueDate < today;
        const title = book
            ? book.title
            : (borrowing.bookTitle || 'Buku #' + borrowing.bookId);

        html += `
          <tr>
            <td>${index + 1}</td>
            <td><strong>${title}</strong></td>
            <td>${formatDate(new Date(borrowing.borrowDate))}</td>
            <td class="${isOverdue ? 'overdue-text' : ''}">
                ${formatDate(dueDate)}
            </td>
            <td>
              <span class="badge ${isOverdue ? 'badge-overdue' : 'badge-active'}">
                ${isOverdue ? '⚠️ Terlambat' : '✅ Aktif'}
              </span>
            </td>
            <td>
              <button class="btn btn-warning btn-sm"
                onclick="returnBook('${borrowing.id}', ${borrowing.bookId})">
                ↩️ Kembalikan
              </button>
            </td>
          </tr>`;
    });

    html += '</tbody></table></div>';
    container.innerHTML = html;
}

// ─── RENDER KATALOG BUKU ─────────────────────────────────────

function renderBooks(books, userActiveBorrowings) {
    const container = document.getElementById('bookList');

    if (!books || books.length === 0) {
        container.innerHTML =
            '<p class="empty-msg">Tidak ada buku tersedia dalam katalog.</p>';
        return;
    }

    const userBookIds = userActiveBorrowings.map(
        borrowing => borrowing.bookId
    );

    const maxReached = userActiveBorrowings.length >= 3;

    let html = '<div class="book-grid">';

    books.forEach(book => {
        const alreadyBorrowedByMe = userBookIds.includes(book.id);

        let buttonText = '📥 Pinjam';
        let buttonClass = 'btn-success';
        let buttonAttributes = `onclick="borrowBook(${book.id})"`;

        if (!book.available) {
            buttonText = '🚫 Sedang Dipinjam';
            buttonClass = 'btn-disabled';
            buttonAttributes = 'disabled';
        } else if (alreadyBorrowedByMe) {
            buttonText = '📌 Sedang Anda Pinjam';
            buttonClass = 'btn-disabled';
            buttonAttributes = 'disabled';
        } else if (maxReached) {
            buttonText = '🔒 Batas Tercapai';
            buttonClass = 'btn-disabled';
            buttonAttributes = 'disabled';
        }

        html += `
          <div class="book-card">
            <div class="book-card-icon">📕</div>
            <div>
              <div class="book-title">${book.title}</div>
              <div class="book-author">✍️ ${book.author}</div>
              <span class="book-status ${book.available ? 'status-available' : 'status-unavailable'}">
                ${book.available ? '✅ Tersedia' : '❌ Sedang Dipinjam'}
              </span>
            </div>
            <button class="btn ${buttonClass}" ${buttonAttributes}>
                ${buttonText}
            </button>
          </div>`;
    });

    html += '</div>';
    container.innerHTML = html;
}

// ─── PEMINJAMAN BUKU ─────────────────────────────────────────

async function borrowBook(bookId) {
    const session = getSession();

    if (!session) {
        alert('Sesi habis. Silakan login kembali.');
        showLoginPage();
        return;
    }

    try {
        const response = await fetch('/api/borrowings', {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({
                nim: session.nim,
                bookId
            })
        });

        const data = await response.json();

        if (response.status === 401 || response.status === 403) {
            handleExpiredSession();
            return;
        }

        if (!response.ok) {
            alert(`❌ Peminjaman ditolak:\n${data.error || data.message}`);
            await renderAll();
            return;
        }

        alert(
            `✅ Peminjaman berhasil!\n\n${data.message}\nBatas pengembalian: ${formatDate(new Date(data.borrowing.dueDate))}`
        );

        await renderAll();

    } catch (error) {
        console.error('Borrow error:', error);
        alert('⚠️ Gagal menghubungi backend. Periksa apakah server aktif.');
    }
}

// ─── PENGEMBALIAN BUKU ───────────────────────────────────────

async function returnBook(borrowingId, bookId) {
    if (!confirm('Apakah Anda yakin ingin mengembalikan buku ini?')) {
        return;
    }

    try {
        const response = await fetch('/api/borrowings/return', {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({
                borrowingId,
                bookId
            })
        });

        const data = await response.json();

        if (response.status === 401 || response.status === 403) {
            handleExpiredSession();
            return;
        }

        if (!response.ok) {
            alert(`❌ Gagal mengembalikan:\n${data.error || data.message}`);
            await renderAll();
            return;
        }

        alert(`✅ ${data.message}`);
        await renderAll();

    } catch (error) {
        console.error('Return error:', error);
        alert('⚠️ Gagal menghubungi backend. Periksa apakah server aktif.');
    }
}

// ─── HELPER ──────────────────────────────────────────────────

function formatDate(date) {
    return date.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
    });
}

// ─── INISIALISASI ────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', function () {
    const session = getSession();

    if (session) {
        showMainPage(session);
    } else {
        showLoginPage();
    }

    ['nim', 'password'].forEach(id => {
        const element = document.getElementById(id);

        if (element) {
            element.addEventListener('keydown', event => {
                if (event.key === 'Enter') {
                    login();
                }
            });
        }
    });
});