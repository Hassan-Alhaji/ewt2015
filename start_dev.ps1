Write-Host "==========================================================" -ForegroundColor Green
Write-Host "   Eastern Walking Team - Walking Lifestyle Platform      " -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "Starting development servers..." -ForegroundColor Cyan

# Start Backend Django API in a new PowerShell window
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Write-Host 'Starting Django API...' -ForegroundColor Green; cd '$PSScriptRoot/backend'; .\venv\Scripts\activate; python manage.py runserver 8000"

# Start Frontend Next.js App in a new PowerShell window
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Write-Host 'Starting Next.js Frontend...' -ForegroundColor Green; cd '$PSScriptRoot/frontend'; npm run dev"

Write-Host "Servers launched in separate windows:" -ForegroundColor Cyan
Write-Host " - Django API Backend: http://localhost:8000" -ForegroundColor Gray
Write-Host " - Next.js Frontend: http://localhost:3000" -ForegroundColor Gray
Write-Host " - Test Admin Credentials:" -ForegroundColor Green
Write-Host "   Mobile: 0500000000" -ForegroundColor White
Write-Host "   Password (Django Admin): adminpassword" -ForegroundColor White
Write-Host "==========================================================" -ForegroundColor Green
