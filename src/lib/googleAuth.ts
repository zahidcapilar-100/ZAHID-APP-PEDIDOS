// Google Identity Services (GIS) and Google Picker API Helper

export interface AdminUser {
  email: string;
  name: string;
  picture?: string;
  sub?: string;
}

export interface AdminSession {
  token: string;
  expiresAt: number; // Unix timestamp in ms
  user: AdminUser;
}

export interface SelectedSheet {
  id: string;
  name: string;
  url?: string;
}

const SESSION_KEY = 'capilaris_admin_session_v4';

let gisLoaded = false;
let gapiLoaded = false;
let pickerLoaded = false;

/**
 * Dynamically loads Google Identity Services and gapi scripts ONLY when needed in /admin
 */
export const loadGoogleSdk = (): Promise<boolean> => {
  return new Promise((resolve, reject) => {
    if (gisLoaded && gapiLoaded && pickerLoaded) {
      resolve(true);
      return;
    }

    let loadedCount = 0;
    const checkComplete = () => {
      loadedCount++;
      if (loadedCount >= 2) {
        // Load gapi picker extension
        if ((window as any).gapi) {
          (window as any).gapi.load('picker', () => {
            pickerLoaded = true;
            resolve(true);
          });
        } else {
          resolve(true);
        }
      }
    };

    // Load GIS client
    if (!document.getElementById('google-gis-script')) {
      const scriptGis = document.createElement('script');
      scriptGis.id = 'google-gis-script';
      scriptGis.src = 'https://accounts.google.com/gsi/client';
      scriptGis.async = true;
      scriptGis.defer = true;
      scriptGis.onload = () => {
        gisLoaded = true;
        checkComplete();
      };
      scriptGis.onerror = (err) => reject(new Error('Failed to load Google GIS script'));
      document.head.appendChild(scriptGis);
    } else {
      gisLoaded = true;
      checkComplete();
    }

    // Load GAPI client
    if (!document.getElementById('google-gapi-script')) {
      const scriptGapi = document.createElement('script');
      scriptGapi.id = 'google-gapi-script';
      scriptGapi.src = 'https://apis.google.com/js/api.js';
      scriptGapi.async = true;
      scriptGapi.defer = true;
      scriptGapi.onload = () => {
        gapiLoaded = true;
        checkComplete();
      };
      scriptGapi.onerror = (err) => reject(new Error('Failed to load Google GAPI script'));
      document.head.appendChild(scriptGapi);
    } else {
      gapiLoaded = true;
      checkComplete();
    }
  });
};

/**
 * Gets environment configuration for OAuth and Whitelist
 */
export const getAuthConfig = () => {
  const clientId = (import.meta.env.VITE_GOOGLE_CLIENT_ID as string) || '';
  const apiKey = (import.meta.env.VITE_GOOGLE_API_KEY as string) || '';
  const allowedAdminsRaw = (import.meta.env.VITE_ADMINS_PERMITIDOS as string) || '';

  const allowedAdmins = allowedAdminsRaw
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  return {
    clientId: clientId.trim(),
    apiKey: apiKey.trim(),
    allowedAdmins,
  };
};

/**
 * Checks if user email is in VITE_ADMINS_PERMITIDOS whitelist
 */
export const isEmailWhitelisted = (email: string): boolean => {
  const { allowedAdmins } = getAuthConfig();
  if (allowedAdmins.length === 0) return true; // If empty, permit access or prompt
  const cleanEmail = email.toLowerCase().trim();
  return allowedAdmins.some((allowed) => allowed === '*' || allowed === cleanEmail);
};

/**
 * Session storage helpers
 */
export const getAdminSession = (): AdminSession | null => {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session: AdminSession = JSON.parse(raw);
    if (Date.now() >= session.expiresAt) {
      sessionStorage.removeItem(SESSION_KEY);
      return null;
    }
    return session;
  } catch {
    return null;
  }
};

export const saveAdminSession = (session: AdminSession): void => {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch (e) {
    console.warn('Failed to save session:', e);
  }
};

export const clearAdminSession = (): void => {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch (e) {
    console.warn('Failed to clear session:', e);
  }
};

/**
 * Fetch Google user profile using access token
 */
export const fetchGoogleUserProfile = async (accessToken: string): Promise<AdminUser> => {
  const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error('No se pudo obtener la información de perfil de Google.');
  }

  const data = await response.json();
  return {
    email: data.email,
    name: data.name || data.email,
    picture: data.picture,
    sub: data.sub,
  };
};

/**
 * Triggers Google OAuth Token Client flow via GIS
 */
export const requestGoogleToken = (promptType: 'select_account' | '' = ''): Promise<string> => {
  return new Promise((resolve, reject) => {
    const { clientId } = getAuthConfig();

    if (!clientId || clientId.includes('YOUR_GOOGLE_CLIENT_ID')) {
      reject(new Error('VITE_GOOGLE_CLIENT_ID no configurado en el entorno.'));
      return;
    }

    if (!(window as any).google?.accounts?.oauth2) {
      reject(new Error('Librería Google Identity Services no está cargada.'));
      return;
    }

    const tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope:
        'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/spreadsheets openid email profile',
      prompt: promptType,
      callback: (tokenResponse: any) => {
        if (tokenResponse.error) {
          reject(new Error(tokenResponse.error_description || tokenResponse.error));
          return;
        }
        if (tokenResponse.access_token) {
          resolve(tokenResponse.access_token);
        } else {
          reject(new Error('No se recibió token de acceso.'));
        }
      },
    });

    tokenClient.requestAccessToken();
  });
};

/**
 * Revokes access token
 */
export const revokeGoogleToken = (token: string): Promise<void> => {
  return new Promise((resolve) => {
    if ((window as any).google?.accounts?.oauth2?.revoke) {
      (window as any).google.accounts.oauth2.revoke(token, () => {
        clearAdminSession();
        resolve();
      });
    } else {
      clearAdminSession();
      resolve();
    }
  });
};

/**
 * Opens Google Picker to select a Google Spreadsheet
 */
export const showGooglePicker = (
  accessToken: string,
  onSelect: (sheet: SelectedSheet) => void,
  onCancel?: () => void
) => {
  const { apiKey } = getAuthConfig();
  const google = (window as any).google;

  if (!google || !google.picker) {
    alert('La API de Google Picker no está lista. Inténtalo de nuevo en unos segundos.');
    return;
  }

  const view = new google.picker.View(google.picker.ViewId.SPREADSHEETS);
  view.setMimeTypes('application/vnd.google-apps.spreadsheet');

  const builder = new google.picker.PickerBuilder()
    .addView(view)
    .setOAuthToken(accessToken)
    .setTitle('Selecciona tu Hoja de Cálculo de Pedidos Capilaris')
    .setCallback((data: any) => {
      if (data.action === google.picker.Action.PICKED) {
        const doc = data.docs[0];
        if (doc) {
          onSelect({
            id: doc.id,
            name: doc.name || 'Hoja de Cálculo',
            url: doc.url || `https://docs.google.com/spreadsheets/d/${doc.id}/edit`,
          });
        }
      } else if (data.action === google.picker.Action.CANCEL) {
        if (onCancel) onCancel();
      }
    });

  if (apiKey && !apiKey.includes('YOUR_')) {
    builder.setDeveloperKey(apiKey);
  }

  const picker = builder.build();
  picker.setVisible(true);
};
