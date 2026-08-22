import { useEffect, useState } from "react";
import {
  addTargetedUser,
  createEnvironment,
  createFlag,
  getEnvironment,
  getFlags,
  getTargeting,
  getHistory,
  removeTargetedUser,
  updateEnvironmentEnabled,
  updateEnvironmentRollout,
  updateKillSwitch,
} from "./api/flags";

interface Flag {
  id: number;
  key: string;
  description: string;
  killSwitch: boolean;
}

interface Environment {
  id: number;
  flagId: number;
  environment: string;
  enabled: boolean;
  rolloutPercentage: number;
}

interface HistoryEntry {
  id: number;
  flag: string;
  environment: string | null;
  actor: string;
  action: string;
  before: unknown;
  after: unknown;
  createdAt: string;
}
const environmentNames: string[] = (import.meta.env.VITE_ENVIRONMENTS ?? "")
  .split(",")
  .map((environment: string) => environment.trim())
  .filter(Boolean);
function App() {
  const [flags, setFlags] = useState<Flag[]>([]);
  const [environments, setEnvironments] = useState<
    Record<string, Record<string, Environment>>
  >({});
  const [targeting, setTargeting] = useState<
    Record<string, Record<string, string[]>>
  >({});

  const [newUserIds, setNewUserIds] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  const [updating, setUpdating] = useState("");

  const [history, setHistory] = useState<Record<string, HistoryEntry[]>>({});
  const [showHistory, setShowHistory] = useState<Record<string, boolean>>({});
  const [historyLoading, setHistoryLoading] = useState("");

  async function loadEnvironments(currentFlags: Flag[]) {
    const environmentData: Record<string, Record<string, Environment>> = {};

    await Promise.all(
      currentFlags.map(async (flag) => {
        environmentData[flag.key] = {};

        await Promise.all(
          environmentNames.map(async (environment) => {
            try {
              const result = await getEnvironment(flag.key, environment);

              environmentData[flag.key][environment] = result;
            } catch {
              // Environment has not been configured yet.
            }
          }),
        );
      }),
    );

    setEnvironments(environmentData);
  }

  async function loadTargeting(currentFlags: Flag[]) {
    const targetingData: Record<string, Record<string, string[]>> = {};

    await Promise.all(
      currentFlags.map(async (flag) => {
        targetingData[flag.key] = {};

        await Promise.all(
          environmentNames.map(async (environment) => {
            try {
              const result = await getTargeting(flag.key, environment);

              targetingData[flag.key][environment] = result.users;
            } catch {
              // Environment or targeting has not been configured yet.
              targetingData[flag.key][environment] = [];
            }
          }),
        );
      }),
    );

    setTargeting(targetingData);
  }
  async function loadFlags() {
    try {
      setLoading(true);
      setError("");

      const data = await getFlags();

      setFlags(data);
      await loadEnvironments(data);
      await loadTargeting(data);
    } catch (error) {
      console.error(error);
      setError("Failed to load flags");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadFlags();
  }, []);

  async function handleCreateFlag(event: React.FormEvent) {
    event.preventDefault();

    if (!newKey.trim() || !newDescription.trim()) {
      return;
    }

    setCreating(true);
    setCreateError("");

    try {
      const flag = await createFlag(newKey.trim(), newDescription.trim());

      setFlags((current) => [...current, flag]);

      setEnvironments((current) => ({
        ...current,
        [flag.key]: {},
      }));

      setNewKey("");
      setNewDescription("");
      setShowCreateForm(false);
    } catch (error) {
      if (error instanceof Error) {
        setCreateError(error.message);
      } else {
        setCreateError("Failed to create flag");
      }
    } finally {
      setCreating(false);
    }
  }

  async function handleCreateEnvironment(flagKey: string, environment: string) {
    const updateKey = `${flagKey}-${environment}`;

    try {
      setUpdating(updateKey);

      const result = await createEnvironment(flagKey, environment);

      setEnvironments((current) => ({
        ...current,
        [flagKey]: {
          ...current[flagKey],
          [environment]: result,
        },
      }));
    } catch (error) {
      console.error(error);
      setError(`Failed to create ${environment} for ${flagKey}`);
    } finally {
      setUpdating("");
    }
  }

  async function handleToggleEnvironment(
    flagKey: string,
    environment: string,
    enabled: boolean,
  ) {
    const updateKey = `${flagKey}-${environment}`;

    try {
      setUpdating(updateKey);

      const result = await updateEnvironmentEnabled(
        flagKey,
        environment,
        enabled,
      );

      setEnvironments((current) => ({
        ...current,
        [flagKey]: {
          ...current[flagKey],
          [environment]: result,
        },
      }));
    } catch (error) {
      console.error(error);
      setError("Failed to update environment");
    } finally {
      setUpdating("");
    }
  }

  async function handleRolloutChange(
    flagKey: string,
    environment: string,
    percentage: number,
  ) {
    if (Number.isNaN(percentage) || percentage < 0 || percentage > 100) {
      return;
    }

    const updateKey = `${flagKey}-${environment}`;

    try {
      setUpdating(updateKey);

      const result = await updateEnvironmentRollout(
        flagKey,
        environment,
        percentage,
      );

      setEnvironments((current) => ({
        ...current,
        [flagKey]: {
          ...current[flagKey],
          [environment]: result,
        },
      }));
    } catch (error) {
      console.error(error);
      setError("Failed to update rollout");
    } finally {
      setUpdating("");
    }
  }
  async function handleAddTargetedUser(flagKey: string, environment: string) {
    const userKey = `${flagKey}-${environment}`;
    const userId = newUserIds[userKey]?.trim();

    if (!userId) {
      return;
    }

    try {
      setUpdating(userKey);

      await addTargetedUser(flagKey, environment, userId);

      setTargeting((current) => ({
        ...current,
        [flagKey]: {
          ...current[flagKey],
          [environment]: [...(current[flagKey]?.[environment] ?? []), userId],
        },
      }));

      setNewUserIds((current) => ({
        ...current,
        [userKey]: "",
      }));
    } catch (error) {
      console.error(error);
      setError("Failed to add targeted user");
    } finally {
      setUpdating("");
    }
  }
  async function handleRemoveTargetedUser(
    flagKey: string,
    environment: string,
    userId: string,
  ) {
    const updateKey = `${flagKey}-${environment}`;

    try {
      setUpdating(updateKey);

      await removeTargetedUser(flagKey, environment, userId);

      setTargeting((current) => ({
        ...current,
        [flagKey]: {
          ...current[flagKey],
          [environment]: (current[flagKey]?.[environment] ?? []).filter(
            (user) => user !== userId,
          ),
        },
      }));
    } catch (error) {
      console.error(error);
      setError("Failed to remove targeted user");
    } finally {
      setUpdating("");
    }
  }

  async function handleViewHistory(flagKey: string) {
    if (showHistory[flagKey]) {
      setShowHistory((current) => ({
        ...current,
        [flagKey]: false,
      }));
      return;
    }

    try {
      setHistoryLoading(flagKey);

      const data = await getHistory(flagKey);

      setHistory((current) => ({
        ...current,
        [flagKey]: data,
      }));

      setShowHistory((current) => ({
        ...current,
        [flagKey]: true,
      }));
    } catch (error) {
      console.error(error);
      setError("Failed to load flag history");
    } finally {
      setHistoryLoading("");
    }
  }
  async function handleKillSwitch(flagKey: string, engaged: boolean) {
    const updateKey = `${flagKey}-kill-switch`;

    try {
      setUpdating(updateKey);

      const result = await updateKillSwitch(flagKey, engaged);

      setFlags((current) =>
        current.map((flag) =>
          flag.key === flagKey
            ? {
                ...flag,
                killSwitch: result.killSwitch,
              }
            : flag,
        ),
      );
    } catch (error) {
      console.error(error);
      setError("Failed to update kill switch");
    } finally {
      setUpdating("");
    }
  }
  if (loading) {
    return (
      <main className="min-h-screen bg-slate-100 flex items-center justify-center">
        <p className="text-slate-600">Loading flags...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100">
      <div className="mx-auto max-w-7xl px-6 py-10">
        {/* Header */}
        <header className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              Feature Flag Admin
            </h1>

            <p className="mt-2 text-slate-500">
              Manage feature flags across your environments.
            </p>
          </div>

          <button
            onClick={() => setShowCreateForm((current) => !current)}
            className="rounded-lg bg-blue-600 px-5 py-3 font-medium text-white transition hover:bg-blue-700"
          >
            {showCreateForm ? "Cancel" : "+ New Flag"}
          </button>
        </header>

        {/* Global error */}
        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">
            {error}
          </div>
        )}

        {/* Create flag */}
        {showCreateForm && (
          <form
            onSubmit={handleCreateFlag}
            className="mb-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <h2 className="mb-5 text-xl font-semibold text-slate-900">
              Create New Flag
            </h2>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Key
                </label>

                <input
                  value={newKey}
                  onChange={(event) => setNewKey(event.target.value)}
                  placeholder="new-dashboard"
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Description
                </label>

                <input
                  value={newDescription}
                  onChange={(event) => setNewDescription(event.target.value)}
                  placeholder="Enable the new dashboard"
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  required
                />
              </div>
            </div>

            {createError && (
              <p className="mt-4 text-sm text-red-600">{createError}</p>
            )}

            <button
              type="submit"
              disabled={creating}
              className="mt-5 rounded-lg bg-slate-900 px-5 py-3 font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {creating ? "Creating..." : "Create Flag"}
            </button>
          </form>
        )}

        {/* Flags */}
        <div className="space-y-6">
          {flags.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
              <p className="text-slate-500">No feature flags yet.</p>
            </div>
          ) : (
            flags.map((flag) => (
              <section
                key={flag.id}
                className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
              >
                {/* Flag header */}
                <div className="border-b border-slate-200 px-6 py-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="text-xl font-semibold text-slate-900">
                        {flag.key}
                      </h2>

                      <p className="mt-1 text-sm text-slate-500">
                        {flag.description}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() =>
                          handleKillSwitch(flag.key, !flag.killSwitch)
                        }
                        disabled={updating === `${flag.key}-kill-switch`}
                        className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                          flag.killSwitch
                            ? "bg-red-600 text-white hover:bg-red-700"
                            : "border border-red-300 text-red-600 hover:bg-red-50"
                        } disabled:cursor-not-allowed disabled:opacity-50`}
                      >
                        {updating === `${flag.key}-kill-switch`
                          ? "Updating..."
                          : flag.killSwitch
                            ? "Release Kill Switch"
                            : "Engage Kill Switch"}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleViewHistory(flag.key)}
                        disabled={historyLoading === flag.key}
                        className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                      >
                        {historyLoading === flag.key
                          ? "Loading..."
                          : showHistory[flag.key]
                            ? "Hide History"
                            : "View History"}
                      </button>

                      <code className="rounded-md bg-slate-100 px-3 py-1 text-sm text-slate-600">
                        #{flag.id}
                      </code>
                    </div>
                  </div>
                </div>

                {/* History */}
                {showHistory[flag.key] && (
                  <div className="border-b border-slate-200 bg-slate-50 px-6 py-5">
                    <h3 className="mb-4 font-semibold text-slate-900">
                      Flag History
                    </h3>

                    {(history[flag.key] ?? []).length === 0 ? (
                      <p className="text-sm text-slate-500">
                        No history available.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {(history[flag.key] ?? []).map((entry) => (
                          <div
                            key={entry.id}
                            className="rounded-lg border border-slate-200 bg-white p-4"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div>
                                <span className="font-medium text-slate-900">
                                  {entry.action}
                                </span>

                                <span className="ml-2 text-sm text-slate-500">
                                  {entry.environment ?? "global"}
                                </span>
                              </div>

                              <span className="text-xs text-slate-400">
                                {new Date(entry.createdAt).toLocaleString()}
                              </span>
                            </div>

                            <div className="mt-2 text-sm text-slate-600">
                              <p>
                                <strong>Actor:</strong> {entry.actor}
                              </p>

                              <p>
                                <strong>Before:</strong>{" "}
                                {entry.before === null
                                  ? "null"
                                  : JSON.stringify(entry.before)}
                              </p>

                              <p>
                                <strong>After:</strong>{" "}
                                {entry.after === null
                                  ? "null"
                                  : JSON.stringify(entry.after)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {/* Environments */}
                <div className="grid divide-y divide-slate-200 md:grid-cols-2 md:divide-x md:divide-y-0">
                  {environmentNames.map((environment) => {
                    const config = environments[flag.key]?.[environment];

                    const updateKey = `${flag.key}-${environment}`;
                    const isUpdating = updating === updateKey;

                    return (
                      <div key={environment} className="p-6">
                        <div className="mb-5 flex items-center justify-between">
                          <h3 className="font-semibold capitalize text-slate-900">
                            {environment}
                          </h3>

                          {config && (
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                config.enabled
                                  ? "bg-green-100 text-green-700"
                                  : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {config.enabled ? "ON" : "OFF"}
                            </span>
                          )}
                        </div>

                        {!config ? (
                          <div>
                            <p className="mb-4 text-sm text-slate-500">
                              This environment is not configured yet.
                            </p>

                            <button
                              onClick={() =>
                                handleCreateEnvironment(flag.key, environment)
                              }
                              disabled={isUpdating}
                              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                            >
                              {isUpdating
                                ? "Creating..."
                                : `Configure ${environment}`}
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-5">
                            {/* Enable / Disable */}
                            <div>
                              <label className="mb-2 block text-sm font-medium text-slate-700">
                                Status
                              </label>

                              <button
                                onClick={() =>
                                  handleToggleEnvironment(
                                    flag.key,
                                    environment,
                                    !config.enabled,
                                  )
                                }
                                disabled={isUpdating}
                                className={`w-full rounded-lg px-4 py-3 font-medium transition ${
                                  config.enabled
                                    ? "bg-green-600 text-white hover:bg-green-700"
                                    : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                                } disabled:cursor-not-allowed disabled:opacity-50`}
                              >
                                {isUpdating
                                  ? "Updating..."
                                  : config.enabled
                                    ? "Turn OFF"
                                    : "Turn ON"}
                              </button>
                            </div>

                            {/* Rollout */}
                            <div>
                              <div className="mb-2 flex justify-between">
                                <label className="text-sm font-medium text-slate-700">
                                  Rollout percentage
                                </label>

                                <span className="text-sm font-semibold text-slate-900">
                                  {config.rolloutPercentage}%
                                </span>
                              </div>
                              {/* Targeted users */}
                              <div>
                                <label className="mb-2 block text-sm font-medium text-slate-700">
                                  Targeted users
                                </label>

                                <div className="flex gap-2">
                                  <input
                                    value={newUserIds[updateKey] ?? ""}
                                    onChange={(event) =>
                                      setNewUserIds((current) => ({
                                        ...current,
                                        [updateKey]: event.target.value,
                                      }))
                                    }
                                    placeholder="user-123"
                                    className="min-w-0 flex-1 rounded-lg border border-slate-300 px-4 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                    disabled={isUpdating}
                                    onKeyDown={(event) => {
                                      if (event.key === "Enter") {
                                        event.preventDefault();
                                        handleAddTargetedUser(
                                          flag.key,
                                          environment,
                                        );
                                      }
                                    }}
                                  />

                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleAddTargetedUser(
                                        flag.key,
                                        environment,
                                      )
                                    }
                                    disabled={
                                      isUpdating ||
                                      !newUserIds[updateKey]?.trim()
                                    }
                                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    {isUpdating ? "Adding..." : "Add"}
                                  </button>
                                </div>

                                <div className="mt-3 space-y-2">
                                  {(targeting[flag.key]?.[environment] ?? [])
                                    .length === 0 ? (
                                    <p className="text-sm text-slate-400">
                                      No targeted users.
                                    </p>
                                  ) : (
                                    (
                                      targeting[flag.key]?.[environment] ?? []
                                    ).map((userId) => (
                                      <div
                                        key={userId}
                                        className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2"
                                      >
                                        <span className="text-sm text-slate-700">
                                          {userId}
                                        </span>

                                        <button
                                          type="button"
                                          onClick={() =>
                                            handleRemoveTargetedUser(
                                              flag.key,
                                              environment,
                                              userId,
                                            )
                                          }
                                          disabled={isUpdating}
                                          className="text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
                                        >
                                          Remove
                                        </button>
                                      </div>
                                    ))
                                  )}
                                </div>
                              </div>
                              <input
                                type="range"
                                min="0"
                                max="100"
                                value={config.rolloutPercentage}
                                onChange={(event) =>
                                  handleRolloutChange(
                                    flag.key,
                                    environment,
                                    Number(event.target.value),
                                  )
                                }
                                disabled={isUpdating}
                                className="w-full accent-blue-600"
                              />

                              <div className="mt-1 flex justify-between text-xs text-slate-400">
                                <span>0%</span>
                                <span>50%</span>
                                <span>100%</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            ))
          )}
        </div>
      </div>
    </main>
  );
}

export default App;
