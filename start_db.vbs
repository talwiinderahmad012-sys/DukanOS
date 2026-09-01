Set UAC = CreateObject("Shell.Application")  
UAC.ShellExecute "powershell.exe", "-Command Start-Service postgresql-x64-16", "", "runas", 1  
