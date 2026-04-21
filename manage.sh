#!/bin/bash
# Oookea Portal Management CLI
# Usage: ./manage.sh <command> [args...]
#
# Commands:
#   clients list                     - List all clients
#   clients create <name> <email> <password> [company]
#   clients get <id>                 - Get client details
#   projects list                    - List all projects
#   projects create <title> <clientId> <category> <startDate>
#   invoices list                    - List all invoices
#   invoices create <clientId> <dueDate> <item1> <qty1> <price1> ...
#   invoices mark-paid <id>          - Mark invoice as paid
#   files list                       - List all files
#   messages list-threads            - List all message threads
#   messages send <threadId> <body>  - Send a message
#   seed                             - Reset & seed demo data
#   stats                            - Show portal statistics

set -e
cd "$(dirname "$0")"

CONVEX_URL="https://quiet-kudu-739.convex.cloud"

convex_run() {
  npx convex run --url "$CONVEX_URL" "$@"
}

case "${1:-}" in
  clients)
    case "${2:-}" in
      list)
        echo "📋 Fetching clients..."
        convex_run "projects:listClients" | head -100
        ;;
      create)
        name="${3:-}"
        email="${4:-}"
        password="${5:-Welcome1!}"
        company="${6:-}"
        if [ -z "$name" ] || [ -z "$email" ]; then
          echo "Usage: $0 clients create <name> <email> [password] [company]"
          exit 1
        fi
        echo "👤 Creating client: $name ($email)"
        convex_run "projects:createClient" "{\"name\":\"$name\",\"email\":\"$email\",\"password\":\"$password\",\"company\":\"$company\"}"
        echo "✅ Client created!"
        ;;
      get)
        id="${3:-}"
        if [ -z "$id" ]; then echo "Usage: $0 clients get <id>"; exit 1; fi
        convex_run "projects:getUserById" "{\"id\":\"$id\"}"
        ;;
      *)
        echo "Usage: $0 clients <list|create|get>"
        ;;
    esac
    ;;

  projects)
    case "${2:-}" in
      list)
        echo "📁 Fetching projects..."
        convex_run "projects:listProjects" "{}" | head -100
        ;;
      create)
        title="${3:-}"
        clientId="${4:-}"
        category="${5:-Website}"
        startDate="${6:-$(date +%Y-%m-%d)}"
        slug=$(echo "$title" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/-/g' | sed 's/--*/-/g' | sed 's/^-//;s/-$//')
        if [ -z "$title" ] || [ -z "$clientId" ]; then
          echo "Usage: $0 projects create <title> <clientId> [category] [startDate]"
          exit 1
        fi
        echo "📁 Creating project: $title"
        convex_run "projects:createProject" "{\"title\":\"$title\",\"slug\":\"$slug\",\"description\":\"$title\",\"category\":\"$category\",\"clientId\":\"$clientId\",\"startDate\":\"$startDate\"}"
        echo "✅ Project created!"
        ;;
      *)
        echo "Usage: $0 projects <list|create>"
        ;;
    esac
    ;;

  invoices)
    case "${2:-}" in
      list)
        echo "💰 Fetching invoices..."
        convex_run "projects:listInvoices" "{}" | head -100
        ;;
      mark-paid)
        id="${3:-}"
        if [ -z "$id" ]; then echo "Usage: $0 invoices mark-paid <id>"; exit 1; fi
        echo "💰 Marking invoice $id as paid..."
        convex_run "projects:updateInvoiceStatus" "{\"id\":\"$id\",\"status\":\"paid\"}"
        echo "✅ Invoice marked as paid!"
        ;;
      *)
        echo "Usage: $0 invoices <list|mark-paid>"
        ;;
    esac
    ;;

  files)
    case "${2:-}" in
      list)
        echo "📎 Fetching files..."
        convex_run "projects:listFiles" "{}" | head -100
        ;;
      *)
        echo "Usage: $0 files <list>"
        ;;
    esac
    ;;

  messages)
    case "${2:-}" in
      list-threads)
        echo "💬 Fetching threads..."
        convex_run "projects:listThreads" "{}" | head -100
        ;;
      send)
        threadId="${3:-}"
        body="${4:-}"
        senderId="${5:-}"
        if [ -z "$threadId" ] || [ -z "$body" ] || [ -z "$senderId" ]; then
          echo "Usage: $0 messages send <threadId> <body> <senderId>"
          exit 1
        fi
        echo "💬 Sending message..."
        convex_run "projects:sendMessage" "{\"threadId\":\"$threadId\",\"body\":\"$body\",\"senderId\":\"$senderId\",\"senderRole\":\"admin\"}"
        echo "✅ Message sent!"
        ;;
      *)
        echo "Usage: $0 messages <list-threads|send>"
        ;;
    esac
    ;;

  seed)
    echo "🌱 Resetting & seeding database..."
    convex_run "projects:resetAndSeed"
    echo "✅ Done! Admin: etiawork@gmail.com / Remybrica-1"
    echo "   Client: sarah@techcorp.com / demo123"
    ;;

  stats)
    echo "📊 Portal Statistics"
    echo "==================="
    clients=$(convex_run "projects:listClients" 2>/dev/null | grep -c '"_id"' || echo "0")
    projects=$(convex_run "projects:listProjects" "{}" 2>/dev/null | grep -c '"_id"' || echo "0")
    invoices=$(convex_run "projects:listInvoices" "{}" 2>/dev/null | grep -c '"_id"' || echo "0")
    echo "  Clients:  $clients"
    echo "  Projects: $projects"
    echo "  Invoices: $invoices"
    ;;

  *)
    echo "🏠 Oookea Portal Management"
    echo ""
    echo "Usage: $0 <command> [args...]"
    echo ""
    echo "Commands:"
    echo "  clients list                          List all clients"
    echo "  clients create <name> <email> [pass]  Create a client"
    echo "  projects list                         List all projects"
    echo "  projects create <title> <clientId>    Create a project"
    echo "  invoices list                         List all invoices"
    echo "  invoices mark-paid <id>               Mark invoice as paid"
    echo "  files list                            List all files"
    echo "  messages list-threads                 List message threads"
    echo "  seed                                  Reset & seed demo data"
    echo "  stats                                 Show portal stats"
    ;;
esac
