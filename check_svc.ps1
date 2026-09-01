Get-CimInstance Win32_Service -Filter "Name='postgresql-x64-16'" | Select-Object Name,State,StartName,PathName
