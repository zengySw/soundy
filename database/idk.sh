docker run -d \
  --name mssql \
  -e 'ACCEPT_EULA=Y' \
  -e 'MSSQL_SA_PASSWORD=VouEXlCFng3dGv2HwM1VD0og3tSLLT' \
  -p 1433:1433 \
  mcr.microsoft.com/mssql/server:2022-latest
