@echo off
title Sistem Perpustakaan Microservices
echo ==============================================================================
echo       SISTEM PEMINJAMAN BUKU PERPUSTAKAAN (MICROSERVICES UNIFIED)
echo ==============================================================================
echo.
echo [1/3] Menyiapkan Book Service      (Port 5001)
echo [2/3] Menyiapkan Borrowing Service (Port 5002)
echo [3/3] Menyiapkan Frontend Web Client (Port 3000)
echo.
echo Memulai server... Tekan Ctrl + C untuk berhenti kapan saja.
echo.
node backend/server.js
pause
