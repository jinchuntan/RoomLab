$ErrorActionPreference = 'Stop'

Write-Host 'Installing RoomLab dependencies with npm...'
& npm.cmd install

Write-Host ''
Write-Host 'RoomLab is ready.'
Write-Host 'Run `npm run dev` to start the relay server and browser simulator.'
