Set UAC = CreateObject("Shell.Application")  
UAC.ShellExecute "powershell.exe", "-ExecutionPolicy Bypass -File D:\DukanOS\fix_db.ps1", "", "runas", 1  
