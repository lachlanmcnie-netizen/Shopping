(function () {
  const CONFIG = window.SHOPPING_CLOUD_CONFIG || {};

  function hasConfig() {
    return Boolean(CONFIG.supabaseUrl && CONFIG.supabaseAnonKey) &&
      !CONFIG.supabaseUrl.includes("YOUR_PROJECT") &&
      !CONFIG.supabaseAnonKey.includes("YOUR_SUPABASE");
  }

  function getClient() {
    if (!hasConfig()) {
      throw new Error("Missing Supabase config in shopping-cloud-config.js");
    }

    if (!window.supabase?.createClient) {
      throw new Error("Supabase client library failed to load.");
    }

    if (!window.ShoppingSupabaseClient) {
      window.ShoppingSupabaseClient = window.supabase.createClient(
        CONFIG.supabaseUrl,
        CONFIG.supabaseAnonKey,
        {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true
          }
        }
      );
    }

    return window.ShoppingSupabaseClient;
  }

  async function getSession() {
    const client = getClient();
    const { data, error } = await client.auth.getSession();

    if (error) {
      throw error;
    }

    return data.session;
  }

  async function requireSession(redirectTo) {
    const session = await getSession();

    if (!session && redirectTo) {
      window.location.replace(redirectTo);
      return null;
    }

    return session;
  }

  async function signOut(redirectTo) {
    const client = getClient();
    await client.auth.signOut();

    if (redirectTo) {
      window.location.replace(redirectTo);
    }
  }

  window.ShoppingAuth = {
    hasConfig,
    getClient,
    getSession,
    requireSession,
    signOut
  };
})();
