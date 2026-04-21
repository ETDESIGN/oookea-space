import { GraphQLClient } from "graphql-request";

const WP_API_URL = process.env.NEXT_PUBLIC_WORDPRESS_URL || "https://oookea.com";
const WP_GRAPHQL_URL = `${WP_API_URL}/graphql`;
const WP_REST_URL = `${WP_API_URL}/wp-json`;

// ─── GraphQL Client ─────────────────────────────────────────────
function createGraphQLClient(token?: string): GraphQLClient {
  const headers: Record<string, string> = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return new GraphQLClient(WP_GRAPHQL_URL, { headers });
}

// ─── REST Helper ────────────────────────────────────────────────
async function wpRest<T>(
  endpoint: string,
  options: RequestInit & { token?: string } = {}
): Promise<T> {
  const { token, ...rest } = options;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(rest.headers as Record<string, string>),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  const res = await fetch(`${WP_REST_URL}${endpoint}`, {
    ...rest,
    headers,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`WP REST error (${res.status}): ${text}`);
  }
  return res.json();
}

// ─── Auth ───────────────────────────────────────────────────────
export async function wpLogin(username: string, password: string) {
  const res = await fetch(`${WP_REST_URL}/jwt-auth/v1/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(
      (data as Record<string, string>)?.message || "Invalid credentials"
    );
  }
  return res.json() as Promise<{ token: string; user_email: string; user_display_name: string }>;
}

export async function wpValidateToken(token: string) {
  try {
    await fetch(`${WP_REST_URL}/jwt-auth/v1/token/validate`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    return true;
  } catch {
    return false;
  }
}

// ─── Current User ───────────────────────────────────────────────
export async function wpGetCurrentUser(token: string) {
  const client = createGraphQLClient(token);
  const data = await client.request(`
    query GetCurrentUser {
      viewer {
        id
        name
        email
        avatar { url }
      }
    }
  `);
  return (data as Record<string, Record<string, unknown>>).viewer;
}

// ─── Projects ───────────────────────────────────────────────────
export async function wpGetProjects(token: string) {
  const client = createGraphQLClient(token);
  const data = await client.request(`
    query GetProjects {
      projects(first: 100) {
        nodes {
          id
          slug
          title
          content
          projectFields {
            status
            progress
            thumbnail
            category
            startDate
            deadline
            brief
            tags
          }
        }
      }
    }
  `);
  return (data as Record<string, { nodes: unknown[] }>).projects.nodes;
}

export async function wpGetProject(slug: string, token: string) {
  const client = createGraphQLClient(token);
  const data = await client.request(
    `
    query GetProject($slug: ID!) {
      project(id: $slug, idType: SLUG) {
        id
        slug
        title
        content
        projectFields {
          status
          progress
          thumbnail
          category
          startDate
          deadline
          brief
          tags
          deliverables { title completed }
          activity { message timestamp user type }
        }
      }
    }
  `,
    { slug }
  );
  return (data as Record<string, unknown>).project;
}

// ─── Invoices ───────────────────────────────────────────────────
export async function wpGetInvoices(token: string) {
  return wpRest<unknown[]>("/wp/v2/invoice?per_page=100", { token });
}

export async function wpGetInvoice(id: string, token: string) {
  return wpRest<unknown>(`/wp/v2/invoice/${id}`, { token });
}

// ─── Files ──────────────────────────────────────────────────────
export async function wpGetFiles(token: string) {
  return wpRest<unknown[]>("/wp/v2/media?per_page=100", { token });
}

export async function wpUploadFile(file: File, token: string) {
  const formData = new FormData();
  formData.append("file", file);
  return fetch(`${WP_REST_URL}/wp/v2/media`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  }).then((r) => r.json());
}

// ─── Messages ───────────────────────────────────────────────────
export async function wpGetMessages(token: string) {
  return wpRest<unknown[]>("/wp/v2/message?per_page=100", { token });
}

// ─── Modules ────────────────────────────────────────────────────
export async function wpGetModules(token: string) {
  return wpRest<unknown[]>("/wp/v2/module?per_page=100", { token });
}
