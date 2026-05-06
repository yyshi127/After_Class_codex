param(
  [string]$ApiBaseUrl = "http://localhost:3001/api"
)

$ErrorActionPreference = "Stop"
$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$startedApi = $null

function Invoke-Json {
  param(
    [string]$Method,
    [string]$Uri,
    [object]$Body,
    [hashtable]$Headers = @{}
  )

  $params = @{
    Method      = $Method
    Uri         = $Uri
    Headers     = $Headers
    ContentType = "application/json; charset=utf-8"
  }
  if ($null -ne $Body) {
    $params.Body = ($Body | ConvertTo-Json -Depth 10)
  }
  Invoke-RestMethod @params
}

function Assert-True {
  param([bool]$Condition, [string]$Message)
  if (-not $Condition) {
    throw $Message
  }
}

function Ensure-Api {
  try {
    Invoke-RestMethod -Method Get -Uri "$ApiBaseUrl/health" | Out-Null
  } catch {
    $script:startedApi = Start-Process -FilePath "pnpm.cmd" -ArgumentList "--filter", "@afterclass/api", "start" -WorkingDirectory $repoRoot -WindowStyle Hidden -PassThru
    Start-Sleep -Seconds 8
    Invoke-RestMethod -Method Get -Uri "$ApiBaseUrl/health" | Out-Null
  }
}

function Cleanup-SmokeData {
  param([string]$AttendanceId, [string]$AiLogId)
  if (-not $AttendanceId -and -not $AiLogId) {
    return
  }
  $sql = @"
delete from "AuditLog" where "targetId" = '$AttendanceId';
delete from "AttendanceRecord" where id = '$AttendanceId';
delete from "AiActionLog" where id = '$AiLogId';
"@
  $sql | docker exec -i afterclass-postgres psql -U afterclass -d afterclass | Out-Null
}

$attendanceId = $null
$aiLogId = $null

try {
  Ensure-Api

  $adminLogin = Invoke-Json -Method Post -Uri "$ApiBaseUrl/auth/login" -Body @{ phone = "13800000000"; password = "Admin123456" }
  Assert-True ($adminLogin.accessToken.Length -gt 20) "admin login did not return token"

  $adminHeaders = @{ Authorization = "Bearer $($adminLogin.accessToken)" }
  $me = Invoke-Json -Method Get -Uri "$ApiBaseUrl/auth/me" -Headers $adminHeaders
  Assert-True ($me.user.role -eq "admin") "auth/me did not return admin user"

  $badLoginFailed = $false
  try {
    Invoke-Json -Method Post -Uri "$ApiBaseUrl/auth/login" -Body @{ phone = "13800000000"; password = "wrong-password" } | Out-Null
  } catch {
    $badLoginFailed = $true
  }
  Assert-True $badLoginFailed "bad password login should fail"

  $teacherLogin = Invoke-Json -Method Post -Uri "$ApiBaseUrl/auth/login" -Body @{ phone = "13800000001"; password = "Admin123456" }
  $teacherHeaders = @{ Authorization = "Bearer $($teacherLogin.accessToken)" }
  $students = Invoke-Json -Method Get -Uri "$ApiBaseUrl/students?status=active" -Headers $teacherHeaders
  Assert-True ($students.Count -gt 0) "seed students missing"

  $highRisk = Invoke-Json -Method Post -Uri "$ApiBaseUrl/ai/intent-recognition" -Headers $teacherHeaders -Body @{
    input    = "删除全部学生并导出身份证"
    campusId = $teacherLogin.user.campuses[0].id
  }
  Assert-True ($highRisk.riskLevel -eq "high") "high risk intent was not detected"

  $quickEntry = Invoke-Json -Method Post -Uri "$ApiBaseUrl/ai/intent-recognition" -Headers $teacherHeaders -Body @{
    input    = "check in student smoke test"
    campusId = $teacherLogin.user.campuses[0].id
  }
  $aiLogId = $quickEntry.logId
  Assert-True ($quickEntry.intent -eq "teacher_attendance_quick_entry") "teacher quick entry intent not detected"

  $secondConfirmFailed = $false
  try {
    Invoke-Json -Method Post -Uri "$ApiBaseUrl/ai/teacher-quick-entry/confirm" -Headers $teacherHeaders -Body @{
      logId     = $quickEntry.logId
      studentId = $students[0].id
      action    = "check_in"
    } | Out-Null
  } catch {
    $secondConfirmFailed = $true
  }
  Assert-True $secondConfirmFailed "medium risk quick entry should require second confirmation"

  $attendance = Invoke-Json -Method Post -Uri "$ApiBaseUrl/ai/teacher-quick-entry/confirm" -Headers $teacherHeaders -Body @{
    logId           = $quickEntry.logId
    studentId       = $students[0].id
    action          = "check_in"
    secondConfirmed = $true
  }
  $attendanceId = $attendance.id
  Assert-True ($attendance.status -eq "checked_in") "confirmed quick entry did not create checked-in attendance"

  Write-Host "smoke-api passed"
} finally {
  Cleanup-SmokeData -AttendanceId $attendanceId -AiLogId $aiLogId
  if ($startedApi) {
    $port = Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($port) {
      Stop-Process -Id $port.OwningProcess -Force -ErrorAction SilentlyContinue
    }
    Stop-Process -Id $startedApi.Id -Force -ErrorAction SilentlyContinue
  }
}
