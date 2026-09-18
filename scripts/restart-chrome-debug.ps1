# 평소 쓰는 크롬을 --remote-debugging-port=9222 옵션으로 재시작한다.
# 이렇게 해야 Playwright가 새 프로필이 아니라 지금 로그인되어 있는 그 크롬에 직접 붙을 수 있다.
#
# ⚠️ 주의: 열려있는 크롬 창을 전부 닫았다가 다시 켭니다.
#   크롬의 "종료 시 열려있던 페이지 복원" 설정이 켜져 있으면 탭들이 자동으로 복원되지만,
#   혹시 저장 안 한 입력 중인 내용(글쓰기 중이던 폼 등)이 있다면 이 스크립트를 실행하기 전에
#   먼저 저장해 두세요.

Write-Host "실행 중인 크롬을 종료합니다..."
Get-Process chrome -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

$chromePath = "C:\Program Files\Google\Chrome\Application\chrome.exe"
if (-not (Test-Path $chromePath)) {
    Write-Error "크롬 실행파일을 찾지 못했습니다: $chromePath"
    exit 1
}

Write-Host "디버그 모드로 크롬을 다시 켭니다 (포트 9222)..."
Start-Process $chromePath -ArgumentList "--remote-debugging-port=9222"

Start-Sleep -Seconds 2
Write-Host "완료. 이제 딸깍비서 서버가 이 크롬에 바로 붙을 수 있습니다."
