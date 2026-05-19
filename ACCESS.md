# Oookea Space — Environment & Access Reference

## Convex Backend
- **URL**: `https://quiet-kudu-739.convex.cloud`
- **HTTP Actions**: `https://quiet-kudu-739.convex.site`
- **Dashboard**: https://dashboard.convex.dev/d/quiet-kudu-739
- **Deploy Key**: `eyJ2MiI6ImNkMmI5NTQ4M2Q0ZTRmNzg5NWJiYzlmYWE4ZmY0NzhlIn0=`

## Login Credentials
- **Admin**: etiawork@gmail.com / Remybrica-1
- **Demo Client**: sarah@techcorp.com / demo123

## API Keys
- **Gemini**: AIzaSyDYtRsX1BTi_I1I1tEgtFKkxgyrmWAEixY

## Management CLI
```bash
cd /home/e/oookea-space
./manage.sh clients list          # List clients
./manage.sh clients create "Name" "email" "password"
./manage.sh projects list         # List projects
./manage.sh invoices list         # List invoices
./manage.sh seed                  # Reset & seed demo data
./manage.sh stats                 # Portal stats
```

## Convex CLI (direct)
```bash
cd /home/e/oookea-space
npx convex run projects:listClients
npx convex run projects:createClient '{"name":"...","email":"...","password":"..."}'
npx convex run projects:resetAndSeed
npx convex dev --once --typecheck disable   # Deploy functions
```

## Netlify
- Set env var: `NEXT_PUBLIC_CONVEX_URL=https://quiet-kudu-739.convex.cloud`

## GitHub
- Repo: https://github.com/ETDESIGN/oookea-space
