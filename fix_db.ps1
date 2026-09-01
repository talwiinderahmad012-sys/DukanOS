Copy-Item "C:\Program Files\Microsoft OneDrive\26.145.0728.0011\vcruntime140.dll" -Destination "D:\postgresql\bin\" -Force  
Copy-Item "C:\Program Files\Microsoft OneDrive\26.145.0728.0011\msvcp140.dll" -Destination "D:\postgresql\bin\" -Force  
Start-Service postgresql-x64-16 
