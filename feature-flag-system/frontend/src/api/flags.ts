const API_URL = "http://localhost:3000";

const ACTOR_ID = "admin-ui";

async function getErrorMessage(
  response: Response,
  fallback: string,
): Promise<string> {
  try {
    const data = await response.json();
    return data.error?.message ?? fallback;
  } catch {
    return fallback;
  }
}
export async function getFlags() {
  const response = await fetch(`${API_URL}/flags`);

  if (!response.ok) {
    throw new Error("Failed to fetch flags");
  }

  return response.json();
}

export async function createFlag(key: string, description: string) {
  const response = await fetch(`${API_URL}/flags`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Actor-Id": ACTOR_ID,
    },
    body: JSON.stringify({
      key,
      description,
    }),
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response, "Failed to create flag"));
  }

  return response.json();
}

export async function getEnvironment(flagKey: string, environment: string) {
  const response = await fetch(
    `${API_URL}/flags/${flagKey}/environments/${environment}`,
  );

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(
        response,
        `Failed to fetch ${environment} environment`,
      ),
    );
  }

  return response.json();
}

export async function createEnvironment(flagKey: string, environment: string) {
  const response = await fetch(
    `${API_URL}/flags/${flagKey}/environments/${environment}`,
    {
      method: "POST",
      headers: {
        "X-Actor-Id": ACTOR_ID,
      },
    },
  );

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(response, "Failed to create environment"),
    );
  }

  return response.json();
}

export async function updateEnvironmentEnabled(
  flagKey: string,
  environment: string,
  enabled: boolean,
) {
  const response = await fetch(
    `${API_URL}/flags/${flagKey}/environments/${environment}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "X-Actor-Id": ACTOR_ID,
      },
      body: JSON.stringify({
        enabled,
      }),
    },
  );

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(response, "Failed to update environment"),
    );
  }

  return response.json();
}

export async function updateEnvironmentRollout(
  flagKey: string,
  environment: string,
  percentage: number,
) {
  const response = await fetch(
    `${API_URL}/flags/${flagKey}/environments/${environment}/rollout`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "X-Actor-Id": ACTOR_ID,
      },
      body: JSON.stringify({
        percentage,
      }),
    },
  );

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(response, "Failed to update rollout"),
    );
  }

  return response.json();
}

export async function getTargeting(flagKey: string, environment: string) {
  const response = await fetch(
    `${API_URL}/flags/${flagKey}/environments/${environment}/targeting`,
  );

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(response, "Failed to fetch targeting"),
    );
  }

  return response.json();
}

export async function addTargetedUser(
  flagKey: string,
  environment: string,
  userId: string,
) {
  const response = await fetch(
    `${API_URL}/flags/${flagKey}/environments/${environment}/targeting/${encodeURIComponent(userId)}`,
    {
      method: "POST",
      headers: {
        "X-Actor-Id": ACTOR_ID,
      },
    },
  );

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(response, "Failed to add targeted user"),
    );
  }

  return response.json();
}

export async function removeTargetedUser(
  flagKey: string,
  environment: string,
  userId: string,
) {
  const response = await fetch(
    `${API_URL}/flags/${flagKey}/environments/${environment}/targeting/${encodeURIComponent(userId)}`,
    {
      method: "DELETE",
      headers: {
        "X-Actor-Id": ACTOR_ID,
      },
    },
  );

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(response, "Failed to remove targeted user"),
    );
  }

  return true;
}

export async function getHistory(flagKey: string) {
  const response = await fetch(`${API_URL}/flags/${flagKey}/history`);

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(response, "Failed to fetch flag history"),
    );
  }

  return response.json();
}

export async function updateKillSwitch(flagKey: string, engaged: boolean) {
  const response = await fetch(`${API_URL}/flags/${flagKey}/kill-switch`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "X-Actor-Id": ACTOR_ID,
    },
    body: JSON.stringify({
      enabled: engaged,
    }),
  });

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(response, "Failed to update kill switch"),
    );
  }

  return response.json();
}