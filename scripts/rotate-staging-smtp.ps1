$ErrorActionPreference = 'Stop'
$smtpPassword = Read-Host 'Nueva contraseña de aplicación de eventos@tecplayacar.edu.mx (entrada oculta)' -AsSecureString
$smtpPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($smtpPassword)
try {
    $smtpPlaintext = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($smtpPointer)
    $smtpPlaintext | & node (Join-Path $PSScriptRoot 'rotate-staging-smtp.cjs')
    if ($LASTEXITCODE -ne 0) { throw 'No se pudo actualizar SMTP_CONFIG. Revise el resultado sanitizado.' }
}
finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($smtpPointer)
    $smtpPlaintext = $null
    $smtpPassword.Dispose()
}
