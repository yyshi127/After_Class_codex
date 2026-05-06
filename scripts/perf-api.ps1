param(
  [string]$ApiBaseUrl = "http://localhost:3001/api",
  [int]$MaxStudentListMs = 2000
)

$ErrorActionPreference = "Stop"
$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$startedApi = $null
$campusId = "seed-campus-main"
$classId = "seed-class-one"

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

function Wait-Api {
  param([int]$TimeoutSeconds = 45)
  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  do {
    try {
      Invoke-RestMethod -Method Get -Uri "$ApiBaseUrl/health" | Out-Null
      return
    } catch {
      Start-Sleep -Seconds 1
    }
  } while ((Get-Date) -lt $deadline)
  Invoke-RestMethod -Method Get -Uri "$ApiBaseUrl/health" | Out-Null
}

function Ensure-Api {
  try {
    Invoke-RestMethod -Method Get -Uri "$ApiBaseUrl/health" | Out-Null
  } catch {
    $script:startedApi = Start-Process -FilePath "pnpm.cmd" -ArgumentList "--filter", "@afterclass/api", "start" -WorkingDirectory $repoRoot -WindowStyle Hidden -PassThru
    Wait-Api
  }
}

function Invoke-Sql {
  param([string]$Sql)
  $Sql | docker exec -i afterclass-postgres psql -U afterclass -d afterclass | Out-Null
}

try {
  Ensure-Api
  Invoke-Sql @"
delete from "Student" where id like 'perf_student_%';
insert into "Student" (id, "campusId", "classId", name, gender, grade, "schoolName", status, "createdAt", "updatedAt")
select
  'perf_student_' || gs::text,
  '$campusId',
  '$classId',
  'Perf Student ' || gs::text,
  'unknown',
  'grade-3',
  'Perf Primary School',
  'active',
  now(),
  now()
from generate_series(1, 1000) as gs;
"@

  $adminLogin = Invoke-Json -Method Post -Uri "$ApiBaseUrl/auth/login" -Body @{ phone = "13800000000"; password = "Admin123456" }
  $adminHeaders = @{ Authorization = "Bearer $($adminLogin.accessToken)" }

  $elapsed = Measure-Command {
    $script:pageResult = Invoke-Json -Method Get -Uri "$ApiBaseUrl/students?campusId=$campusId&status=active&page=1&pageSize=100" -Headers $adminHeaders
  }
  Assert-True ($pageResult.items.Count -eq 100) "paginated student list should return 100 items"
  Assert-True ($pageResult.total -ge 1000) "paginated student list should report at least 1000 total students"
  Assert-True ($pageResult.page -eq 1) "paginated student list should report page 1"
  Assert-True ($elapsed.TotalMilliseconds -le $MaxStudentListMs) "1000-student paginated list exceeded ${MaxStudentListMs}ms: $([int]$elapsed.TotalMilliseconds)ms"

  Write-Host "perf-api passed: students page 1 returned $($pageResult.items.Count)/$($pageResult.total) in $([int]$elapsed.TotalMilliseconds)ms"
} finally {
  Invoke-Sql "delete from `"Student`" where id like 'perf_student_%';"
  if ($startedApi) {
    $port = Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($port) {
      Stop-Process -Id $port.OwningProcess -Force -ErrorAction SilentlyContinue
    }
    Stop-Process -Id $startedApi.Id -Force -ErrorAction SilentlyContinue
  }
}
