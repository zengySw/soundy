"use client";

import { useEffect, useMemo, useState } from "react";
import Header from "@/components/Header/Header";
import { apiFetch } from "@/lib/api";

type AdminInfo = {
  userId: string;
  role: string;
  note: string | null;
};

type AdminTrack = {
  id: string;
  album_id: string | null;
  title: string;
  duration_ms: number | null;
  track_number: number | null;
  is_explicit: boolean | null;
  play_count: number | null;
  path: string | null;
};

type AdminUser = {
  id: string;
  username?: string;
  email?: string;
  is_premium?: boolean;
  country_code?: string | null;
  is_active?: boolean;
  created_at?: string | null;
};

type AdminEntry = {
  user_id?: string;
  role?: string;
  granted_at?: string | null;
  granted_by?: string | null;
  note?: string | null;
};

type AdminAlbum = {
  id: string;
  title?: string;
  name?: string;
  artist?: string;
  artist_name?: string;
  year?: number | null;
  release_year?: number | null;
  cover_path?: string | null;
  cover_url?: string | null;
  cover?: string | null;
};

function formatDuration(ms: number | null) {
  if (!ms) {
    return "—";
  }
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export default function AdminMenuPage() {
  const [admin, setAdmin] = useState<AdminInfo | null>(null);
  const [tracks, setTracks] = useState<AdminTrack[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [admins, setAdmins] = useState<AdminEntry[]>([]);
  const [albums, setAlbums] = useState<AdminAlbum[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [autoBusy, setAutoBusy] = useState(false);
  const [otp, setOtp] = useState<string>("");
  const [activeSection, setActiveSection] = useState("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [onlyMissingPath, setOnlyMissingPath] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [uploadResetKey, setUploadResetKey] = useState(0);
  const [batchFiles, setBatchFiles] = useState<File[]>([]);
  const [batchSelected, setBatchSelected] = useState<Set<number>>(new Set());
  const [batchCoverFile, setBatchCoverFile] = useState<File | null>(null);
  const [batchUploading, setBatchUploading] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ done: 0, total: 0 });
  const [batchError, setBatchError] = useState<string | null>(null);
  const [batchSuccess, setBatchSuccess] = useState<string | null>(null);
  const [batchAutoNumber, setBatchAutoNumber] = useState(true);
  const [batchStartNumber, setBatchStartNumber] = useState("1");
  const [batchResetKey, setBatchResetKey] = useState(0);
  const [selectedAlbumId, setSelectedAlbumId] = useState<string>("");
  const [albumForm, setAlbumForm] = useState({
    title: "",
    artist: "",
    year: "",
  });
  const [albumCreating, setAlbumCreating] = useState(false);
  const [albumCreateError, setAlbumCreateError] = useState<string | null>(null);
  const [albumCreateSuccess, setAlbumCreateSuccess] = useState<string | null>(
    null,
  );
  const [uploadForm, setUploadForm] = useState({
    title: "",
    trackNumber: "",
    isExplicit: false,
    albumTitle: "",
    albumArtist: "",
    albumYear: "",
  });

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    setOtp(localStorage.getItem("adminOtp") || "");
  }, []);

  useEffect(() => {
    let mounted = true;

    const mapAdminError = (message?: string) => {
      switch (message) {
        case "No session":
          return "Сессия не найдена. Войдите заново.";
        case "Invalid session":
          return "Сессия истекла. Войдите заново.";
        case "Invalid admin otp":
          return "Неверный Admin OTP. Посмотри в консоли backend.";
        case "Not an admin":
          return "У пользователя нет прав администратора.";
        default:
          return message || "Нет доступа к админке";
      }
    };

    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        if (!otp) {
          setError("Введите Admin OTP (смотри консоль backend).");
          return;
        }
        const res = await apiFetch("/admin/me", {
          headers: {
            "X-Admin-Otp": otp,
          },
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(mapAdminError(data.message));
        }
        const data: AdminInfo = await res.json();
        if (!mounted) {
          return;
        }
        setAdmin(data);

        const [tracksRes, usersRes, adminsRes, albumsRes] = await Promise.all([
          apiFetch("/admin/tracks", {
            headers: { "X-Admin-Otp": otp },
          }),
          apiFetch("/admin/users", {
            headers: { "X-Admin-Otp": otp },
          }),
          apiFetch("/admin/admins", {
            headers: { "X-Admin-Otp": otp },
          }),
          apiFetch("/admin/albums", {
            headers: { "X-Admin-Otp": otp },
          }),
        ]);

        if (!tracksRes.ok) {
          const tracksErr = await tracksRes.json().catch(() => ({}));
          throw new Error(mapAdminError(tracksErr.message));
        }
        if (!usersRes.ok) {
          const usersErr = await usersRes.json().catch(() => ({}));
          throw new Error(mapAdminError(usersErr.message));
        }
        if (!adminsRes.ok) {
          const adminsErr = await adminsRes.json().catch(() => ({}));
          throw new Error(mapAdminError(adminsErr.message));
        }
        if (!albumsRes.ok) {
          const albumsErr = await albumsRes.json().catch(() => ({}));
          throw new Error(mapAdminError(albumsErr.message));
        }

        const tracksData: AdminTrack[] = await tracksRes.json();
        const usersData: AdminUser[] = await usersRes.json();
        const adminsData: AdminEntry[] = await adminsRes.json();
        const albumsData: AdminAlbum[] = await albumsRes.json();

        if (mounted) {
          setTracks(tracksData);
          setUsers(usersData);
          setAdmins(adminsData);
          setAlbums(albumsData);
        }
      } catch (err: any) {
        if (mounted) {
          setError(err.message || "Ошибка загрузки");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, [otp]);

  const isOwner = admin?.role?.toLowerCase() === "owner";

  const stats = useMemo(() => {
    const total = tracks.length;
    const converted = tracks.filter((track) =>
      track.path?.toLowerCase().endsWith(".opus"),
    ).length;
    const missing = tracks.filter((track) => !track.path).length;
    return { total, converted, missing, albums: albums.length };
  }, [tracks, albums.length]);

  const filteredTracks = useMemo(() => {
    let list = tracks;
    if (onlyMissingPath) {
      list = list.filter((track) => !track.path);
    }
    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase();
      list = list.filter((track) =>
        [track.title, track.album_id, track.path]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(query),
      );
    }
    return list;
  }, [tracks, onlyMissingPath, searchQuery]);

  const sections = useMemo(
    () => [
      {
        group: "Основное",
        items: [{ id: "overview", label: "Обзор" }],
      },
      {
        group: "DB",
        items: [
          { id: "db-users", label: "Пользователи" },
          { id: "db-admins", label: "Админы", ownerOnly: true },
        ],
      },
      {
        group: "Контент",
        items: [
          { id: "content-tracks", label: "Треки" },
          { id: "content-albums", label: "Альбомы" },
          { id: "content-upload", label: "Загрузка" },
        ],
      },
      {
        group: "Модерация",
        items: [{ id: "moderation-reports", label: "Жалобы" }],
      },
    ],
    [],
  );

  const formatSize = (bytes: number) => {
    if (!Number.isFinite(bytes)) {
      return "";
    }
    if (bytes < 1024) {
      return `${bytes} B`;
    }
    const kb = bytes / 1024;
    if (kb < 1024) {
      return `${kb.toFixed(1)} KB`;
    }
    const mb = kb / 1024;
    return `${mb.toFixed(1)} MB`;
  };

  const handleConvertTrack = async (track: AdminTrack) => {
    if (!track.path) {
      return;
    }
    setBusyId(track.id);
    try {
      const res = await apiFetch("/admin/convert/track", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Otp": otp,
        },
        body: JSON.stringify({ id: track.id, sourcePath: track.path }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Ошибка конвертации");
      }
      const data = await res.json();
      setTracks((prev) =>
        prev.map((item) =>
          item.id === track.id ? { ...item, path: data.path } : item,
        ),
      );
    } catch (err: any) {
      setError(err.message || "Ошибка конвертации");
    } finally {
      setBusyId(null);
    }
  };

  const handleAutoConvert = async () => {
    setAutoBusy(true);
    try {
      const res = await apiFetch("/admin/convert/auto", {
        method: "POST",
        headers: {
          "X-Admin-Otp": otp,
        },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Ошибка автоконверта");
      }
      await res.json();
    } catch (err: any) {
      setError(err.message || "Ошибка автоконверта");
    } finally {
      setAutoBusy(false);
    }
  };

  const handleCreateAlbum = async (event: React.FormEvent) => {
    event.preventDefault();
    setAlbumCreateError(null);
    setAlbumCreateSuccess(null);
    if (!otp) {
      setAlbumCreateError("Введите Admin OTP перед созданием альбома.");
      return;
    }
    if (!albumForm.title.trim()) {
      setAlbumCreateError("Название альбома обязательно.");
      return;
    }
    try {
      setAlbumCreating(true);
      const res = await apiFetch("/admin/albums", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Otp": otp,
        },
        body: JSON.stringify({
          title: albumForm.title.trim(),
          artist: albumForm.artist.trim() || null,
          year: albumForm.year.trim() || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Ошибка создания альбома");
      }
      const created = await res.json();
      setAlbums((prev) => [created, ...prev]);
      setAlbumCreateSuccess("Альбом добавлен.");
      setAlbumForm({ title: "", artist: "", year: "" });
    } catch (err: any) {
      setAlbumCreateError(err.message || "Ошибка создания альбома");
    } finally {
      setAlbumCreating(false);
    }
  };

  const handleUpload = async (event: React.FormEvent) => {
    event.preventDefault();
    setUploadError(null);
    setUploadSuccess(null);
    if (!otp) {
      setUploadError("Введите Admin OTP перед загрузкой.");
      return;
    }
    if (!audioFile) {
      setUploadError("Выберите аудиофайл.");
      return;
    }

    const formData = new FormData();
    formData.append("audio", audioFile);
    if (coverFile) {
      formData.append("cover", coverFile);
    }
    if (uploadForm.title.trim()) {
      formData.append("title", uploadForm.title.trim());
    }
    if (selectedAlbumId) {
      formData.append("album_id", selectedAlbumId);
    } else if (uploadForm.albumTitle.trim()) {
      formData.append("album_title", uploadForm.albumTitle.trim());
      if (uploadForm.albumArtist.trim()) {
        formData.append("album_artist", uploadForm.albumArtist.trim());
      }
      if (uploadForm.albumYear.trim()) {
        formData.append("album_year", uploadForm.albumYear.trim());
      }
    }
    if (uploadForm.trackNumber.trim()) {
      formData.append("track_number", uploadForm.trackNumber.trim());
    }
    formData.append("is_explicit", uploadForm.isExplicit ? "true" : "false");

    try {
      setUploading(true);
      const res = await apiFetch("/admin/tracks/upload", {
        method: "POST",
        headers: {
          "X-Admin-Otp": otp,
        },
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Ошибка загрузки");
      }
      const data: AdminTrack = await res.json();
      setTracks((prev) => [data, ...prev]);
      setUploadSuccess("Трек загружен и добавлен в библиотеку.");
      setAudioFile(null);
      setCoverFile(null);
      setSelectedAlbumId("");
      setUploadForm({
        title: "",
        trackNumber: "",
        isExplicit: false,
        albumTitle: "",
        albumArtist: "",
        albumYear: "",
      });
      setUploadResetKey((prev) => prev + 1);
    } catch (err: any) {
      setUploadError(err.message || "Ошибка загрузки");
    } finally {
      setUploading(false);
    }
  };

  const handleBatchSelectFiles = (files: FileList | null) => {
    const list = files ? Array.from(files) : [];
    setBatchFiles(list);
    setBatchSelected(new Set(list.map((_, index) => index)));
    setBatchError(null);
    setBatchSuccess(null);
  };

  const toggleBatchFile = (index: number) => {
    setBatchSelected((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const handleBatchUpload = async (event: React.FormEvent) => {
    event.preventDefault();
    setBatchError(null);
    setBatchSuccess(null);

    if (!otp) {
      setBatchError("Введите Admin OTP перед загрузкой.");
      return;
    }
    if (batchSelected.size === 0) {
      setBatchError("Выберите хотя бы один файл.");
      return;
    }
    if (!selectedAlbumId && !uploadForm.albumTitle.trim()) {
      setBatchError("Выберите альбом или укажите его название.");
      return;
    }

    const selectedIndices = Array.from(batchSelected).sort((a, b) => a - b);
    const total = selectedIndices.length;
    setBatchProgress({ done: 0, total });
    setBatchUploading(true);

    let failures = 0;
    let lastError = "";
    const startNumber = Number.parseInt(batchStartNumber, 10);
    let counter = 0;

    for (const index of selectedIndices) {
      const file = batchFiles[index];
      if (!file) {
        continue;
      }
      const formData = new FormData();
      formData.append("audio", file);
      if (batchCoverFile) {
        formData.append("cover", batchCoverFile);
      }
      if (selectedAlbumId) {
        formData.append("album_id", selectedAlbumId);
      } else if (uploadForm.albumTitle.trim()) {
        formData.append("album_title", uploadForm.albumTitle.trim());
        if (uploadForm.albumArtist.trim()) {
          formData.append("album_artist", uploadForm.albumArtist.trim());
        }
        if (uploadForm.albumYear.trim()) {
          formData.append("album_year", uploadForm.albumYear.trim());
        }
      }
      if (batchAutoNumber) {
        const trackNumber = Number.isFinite(startNumber)
          ? startNumber + counter
          : counter + 1;
        formData.append("track_number", String(trackNumber));
      }
      formData.append("is_explicit", uploadForm.isExplicit ? "true" : "false");

      try {
        const res = await apiFetch("/admin/tracks/upload", {
          method: "POST",
          headers: {
            "X-Admin-Otp": otp,
          },
          body: formData,
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.message || "Ошибка загрузки");
        }
        const data: AdminTrack = await res.json();
        setTracks((prev) => [data, ...prev]);
      } catch (err: any) {
        failures += 1;
        lastError = err.message || "Ошибка загрузки";
      } finally {
        counter += 1;
        setBatchProgress((prev) => ({
          done: prev.done + 1,
          total: prev.total,
        }));
      }
    }

    setBatchUploading(false);
    if (failures > 0) {
      setBatchError(`Не удалось загрузить ${failures} из ${total}. ${lastError}`);
    } else {
      setBatchSuccess("Все выбранные треки загружены.");
      setBatchResetKey((prev) => prev + 1);
      setBatchFiles([]);
      setBatchSelected(new Set());
      setBatchCoverFile(null);
    }
  };

  if (loading) {
    return (
      <>
        <div className="bg-gradient" />
        <div className="app">
          <Header />
          <main className="page-main">
            <div className="page-status">Загрузка...</div>
          </main>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="bg-gradient" />
      <div className="app">
        <Header />

        <main className="page-main admin-main">
          <section className="page-hero admin-hero">
            <div className="page-hero-badge">Панель</div>
            <h1 className="page-hero-title">Admin Menu</h1>
            <p className="page-hero-subtitle">
              {admin
                ? `Role: ${admin.role}`
                : "Введите Admin OTP для доступа"}
            </p>
          </section>

          {error && <div className="page-status error">{error}</div>}

          <section className="admin-shell">
            <aside className="admin-sidebar">
              {sections.map((group) => (
                <div key={group.group} className="admin-nav-group">
                  <div className="admin-nav-title">{group.group}</div>
                  {group.items.map((item) => {
                    const isLocked = item.ownerOnly && !isOwner;
                    return (
                      <button
                        key={item.id}
                        className={`admin-nav-item${
                          activeSection === item.id ? " active" : ""
                        }`}
                        type="button"
                        onClick={() => setActiveSection(item.id)}
                        disabled={isLocked}
                      >
                        <span>{item.label}</span>
                        {item.ownerOnly && (
                          <span className="admin-nav-tag">Owner</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              ))}
            </aside>

            <div className="admin-content">
              <section className="admin-toolbar">
                <div className="admin-otp">
                  <label htmlFor="admin-otp">Admin OTP</label>
                  <input
                    id="admin-otp"
                    className="admin-input"
                    placeholder="Введите OTP"
                    value={otp}
                    onChange={(e) => {
                      const next = e.target.value.trim().toLowerCase();
                      setOtp(next);
                      localStorage.setItem("adminOtp", next);
                    }}
                  />
                </div>
                <div className="admin-toolbar-actions">
                  <button
                    className="admin-button"
                    type="button"
                    disabled={autoBusy}
                    onClick={handleAutoConvert}
                  >
                    {autoBusy ? "Конвертирую..." : "Автоконверт"}
                  </button>
                </div>
              </section>

              {activeSection === "overview" && (
                <>
                  <section className="admin-stats">
                    <div className="admin-stat">
                      <div className="admin-stat-title">Всего треков</div>
                      <div className="admin-stat-value">{stats.total}</div>
                    </div>
                    <div className="admin-stat">
                      <div className="admin-stat-title">В .opus</div>
                      <div className="admin-stat-value">{stats.converted}</div>
                    </div>
                    <div className="admin-stat">
                      <div className="admin-stat-title">Без пути</div>
                      <div className="admin-stat-value">{stats.missing}</div>
                    </div>
                    <div className="admin-stat">
                      <div className="admin-stat-title">Альбомы</div>
                      <div className="admin-stat-value">{stats.albums}</div>
                    </div>
                  </section>

                  <section className="admin-card">
                    <h2>Быстрые действия</h2>
                    <p>Здесь появятся автоматические сценарии для контента.</p>
                    <div className="admin-card-actions">
                      <button
                        className="admin-row-button"
                        type="button"
                        disabled={autoBusy}
                        onClick={handleAutoConvert}
                      >
                        {autoBusy ? "Обрабатываю..." : "Автоконвертировать всё"}
                      </button>
                    </div>
                  </section>
                </>
              )}

              {activeSection === "db-users" && (
                <section className="admin-card">
                  <h2>Пользователи</h2>
                  {users.length === 0 ? (
                    <p>Пока нет данных из таблицы users.</p>
                  ) : (
                    <div className="admin-table-wrap">
                      <table className="admin-table">
                        <thead>
                          <tr>
                            <th>ID</th>
                            <th>Username</th>
                            <th>Email</th>
                            <th>Premium</th>
                            <th>Active</th>
                            <th>Country</th>
                          </tr>
                        </thead>
                        <tbody>
                          {users.map((user) => (
                            <tr key={user.id}>
                              <td>{user.id}</td>
                              <td>{user.username ?? "—"}</td>
                              <td>{user.email ?? "—"}</td>
                              <td>{user.is_premium ? "Yes" : "No"}</td>
                              <td>{user.is_active ? "Yes" : "No"}</td>
                              <td>{user.country_code ?? "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>
              )}

              {activeSection === "db-admins" && (
                <section className="admin-card">
                  <h2>Админы</h2>
                  {isOwner ? (
                    admins.length === 0 ? (
                      <p>Пока нет данных из таблицы admins.</p>
                    ) : (
                      <div className="admin-table-wrap">
                        <table className="admin-table">
                          <thead>
                            <tr>
                              <th>User ID</th>
                              <th>Role</th>
                              <th>Granted At</th>
                              <th>Granted By</th>
                              <th>Note</th>
                            </tr>
                          </thead>
                          <tbody>
                            {admins.map((entry, index) => (
                              <tr key={`${entry.user_id ?? "admin"}-${index}`}>
                                <td>{entry.user_id ?? "—"}</td>
                                <td>{entry.role ?? "—"}</td>
                                <td>{entry.granted_at ?? "—"}</td>
                                <td>{entry.granted_by ?? "—"}</td>
                                <td>{entry.note ?? "—"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )
                  ) : (
                    <p>Доступно только для роли owner.</p>
                  )}
                </section>
              )}

              {activeSection === "content-tracks" && (
                <>
                  <section className="admin-card">
                    <h2>Треки</h2>
                    <p>Управляй конвертацией и проверяй наличие файлов.</p>
                    <div className="admin-filters">
                      <input
                        className="admin-input"
                        placeholder="Поиск по названию или пути"
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                      />
                      <label className="admin-checkbox">
                        <input
                          type="checkbox"
                          checked={onlyMissingPath}
                          onChange={(event) =>
                            setOnlyMissingPath(event.target.checked)
                          }
                        />
                        Только без пути
                      </label>
                    </div>
                  </section>

                  <section className="admin-table-wrap">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Title</th>
                          <th>Album</th>
                          <th>Duration</th>
                          <th>Path</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredTracks.map((track) => (
                          <tr key={track.id}>
                            <td>{track.title}</td>
                            <td>{track.album_id ?? "—"}</td>
                            <td>{formatDuration(track.duration_ms)}</td>
                            <td className="admin-muted">{track.path ?? "—"}</td>
                            <td>
                              <button
                                type="button"
                                className="admin-row-button"
                                disabled={!track.path || busyId === track.id}
                                onClick={() => handleConvertTrack(track)}
                              >
                                {busyId === track.id ? "..." : "Convert"}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </section>
                </>
              )}

              {activeSection === "content-albums" && (
                <section className="admin-card">
                  <h2>Альбомы</h2>
                  <form className="admin-upload" onSubmit={handleCreateAlbum}>
                    <div className="admin-upload-grid">
                      <label className="admin-upload-field">
                        <span>Название альбома</span>
                        <input
                          className="admin-input"
                          value={albumForm.title}
                          onChange={(event) =>
                            setAlbumForm((prev) => ({
                              ...prev,
                              title: event.target.value,
                            }))
                          }
                          placeholder="Например: Night Drive"
                        />
                      </label>
                      <label className="admin-upload-field">
                        <span>Артист (опционально)</span>
                        <input
                          className="admin-input"
                          value={albumForm.artist}
                          onChange={(event) =>
                            setAlbumForm((prev) => ({
                              ...prev,
                              artist: event.target.value,
                            }))
                          }
                          placeholder="Имя артиста"
                        />
                      </label>
                      <label className="admin-upload-field">
                        <span>Год (опционально)</span>
                        <input
                          className="admin-input"
                          value={albumForm.year}
                          onChange={(event) =>
                            setAlbumForm((prev) => ({
                              ...prev,
                              year: event.target.value,
                            }))
                          }
                          placeholder="2024"
                        />
                      </label>
                    </div>

                    {albumCreateError && (
                      <div className="admin-upload-error">{albumCreateError}</div>
                    )}
                    {albumCreateSuccess && (
                      <div className="admin-upload-success">{albumCreateSuccess}</div>
                    )}

                    <div className="admin-upload-actions">
                      <button
                        className="admin-button"
                        type="submit"
                        disabled={albumCreating}
                      >
                        {albumCreating ? "Создаю..." : "Добавить альбом"}
                      </button>
                    </div>
                  </form>

                  {albums.length === 0 ? (
                    <p>Пока нет данных из таблицы albums.</p>
                  ) : (
                    <div className="admin-table-wrap">
                      <table className="admin-table">
                        <thead>
                          <tr>
                            <th>ID</th>
                            <th>Title</th>
                            <th>Artist</th>
                            <th>Year</th>
                          </tr>
                        </thead>
                        <tbody>
                          {albums.map((album) => (
                            <tr key={album.id}>
                              <td>{album.id}</td>
                              <td>{album.title ?? album.name ?? "—"}</td>
                              <td>{album.artist ?? album.artist_name ?? "—"}</td>
                              <td>{album.year ?? album.release_year ?? "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>
              )}

              {activeSection === "content-upload" && (
                <section className="admin-card">
                  <h2>Загрузка треков</h2>
                  <p>
                    Загрузи аудио, добавь обложку и мы сохраним трек в базе.
                  </p>
                  <form className="admin-upload" onSubmit={handleUpload}>
                    <div className="admin-upload-grid">
                      <label className="admin-upload-field" key={`audio-${uploadResetKey}`}>
                        <span>Аудиофайл</span>
                        <input
                          type="file"
                          accept="audio/*"
                          onChange={(event) =>
                            setAudioFile(event.target.files?.[0] ?? null)
                          }
                        />
                        {audioFile && (
                          <span className="admin-upload-hint">
                            {audioFile.name}
                          </span>
                        )}
                      </label>

                      <label className="admin-upload-field" key={`cover-${uploadResetKey}`}>
                        <span>Обложка (опционально)</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(event) =>
                            setCoverFile(event.target.files?.[0] ?? null)
                          }
                        />
                        {coverFile && (
                          <span className="admin-upload-hint">
                            {coverFile.name}
                          </span>
                        )}
                      </label>

                      <label className="admin-upload-field">
                        <span>Название (опционально)</span>
                        <input
                          className="admin-input"
                          value={uploadForm.title}
                          onChange={(event) =>
                            setUploadForm((prev) => ({
                              ...prev,
                              title: event.target.value,
                            }))
                          }
                          placeholder="Например: Night Drive"
                        />
                      </label>

                      <label className="admin-upload-field">
                        <span>Альбом</span>
                        <select
                          className="admin-input"
                          value={selectedAlbumId}
                          onChange={(event) => {
                            const value = event.target.value;
                            setSelectedAlbumId(value);
                          }}
                        >
                          <option value="">Создать новый</option>
                          {albums.map((album) => (
                            <option key={album.id} value={album.id}>
                              {album.title ?? album.name ?? album.id}
                            </option>
                          ))}
                        </select>
                      </label>

                      {!selectedAlbumId && (
                        <>
                          <label className="admin-upload-field">
                            <span>Название альбома</span>
                            <input
                              className="admin-input"
                              value={uploadForm.albumTitle}
                              onChange={(event) =>
                                setUploadForm((prev) => ({
                                  ...prev,
                                  albumTitle: event.target.value,
                                }))
                              }
                              placeholder="Например: Midnight Stories"
                            />
                          </label>
                          <label className="admin-upload-field">
                            <span>Артист (опционально)</span>
                            <input
                              className="admin-input"
                              value={uploadForm.albumArtist}
                              onChange={(event) =>
                                setUploadForm((prev) => ({
                                  ...prev,
                                  albumArtist: event.target.value,
                                }))
                              }
                              placeholder="Имя артиста"
                            />
                          </label>
                          <label className="admin-upload-field">
                            <span>Год (опционально)</span>
                            <input
                              className="admin-input"
                              value={uploadForm.albumYear}
                              onChange={(event) =>
                                setUploadForm((prev) => ({
                                  ...prev,
                                  albumYear: event.target.value,
                                }))
                              }
                              placeholder="2024"
                            />
                          </label>
                        </>
                      )}

                      <label className="admin-upload-field">
                        <span>Номер трека (опционально)</span>
                        <input
                          className="admin-input"
                          value={uploadForm.trackNumber}
                          onChange={(event) =>
                            setUploadForm((prev) => ({
                              ...prev,
                              trackNumber: event.target.value,
                            }))
                          }
                          placeholder="1"
                        />
                      </label>

                      <label className="admin-checkbox">
                        <input
                          type="checkbox"
                          checked={uploadForm.isExplicit}
                          onChange={(event) =>
                            setUploadForm((prev) => ({
                              ...prev,
                              isExplicit: event.target.checked,
                            }))
                          }
                        />
                        Explicit
                      </label>
                    </div>

                    {uploadError && (
                      <div className="admin-upload-error">{uploadError}</div>
                    )}
                    {uploadSuccess && (
                      <div className="admin-upload-success">{uploadSuccess}</div>
                    )}

                    <div className="admin-upload-actions">
                      <button
                        className="admin-button"
                        type="submit"
                        disabled={uploading}
                      >
                        {uploading ? "Загрузка..." : "Загрузить"}
                      </button>
                    </div>
                  </form>

                  <div className="admin-batch">
                    <h3>Массовая загрузка</h3>
                    <p>Выбери несколько треков и загрузи их в один альбом.</p>
                    <form onSubmit={handleBatchUpload} className="admin-upload">
                      <div className="admin-upload-grid">
                        <label className="admin-upload-field" key={`batch-audio-${batchResetKey}`}>
                          <span>Аудиофайлы (несколько)</span>
                          <input
                            type="file"
                            accept="audio/*"
                            multiple
                            onChange={(event) => handleBatchSelectFiles(event.target.files)}
                          />
                          {batchFiles.length > 0 && (
                            <span className="admin-upload-hint">
                              Выбрано файлов: {batchFiles.length}
                            </span>
                          )}
                        </label>

                        <label className="admin-upload-field" key={`batch-cover-${batchResetKey}`}>
                          <span>Общая обложка (опционально)</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(event) =>
                              setBatchCoverFile(event.target.files?.[0] ?? null)
                            }
                          />
                          {batchCoverFile && (
                            <span className="admin-upload-hint">
                              {batchCoverFile.name}
                            </span>
                          )}
                        </label>

                        <label className="admin-checkbox">
                          <input
                            type="checkbox"
                            checked={batchAutoNumber}
                            onChange={(event) => setBatchAutoNumber(event.target.checked)}
                          />
                          Автонумерация треков
                        </label>

                        {batchAutoNumber && (
                          <label className="admin-upload-field">
                            <span>Начать с номера</span>
                            <input
                              className="admin-input"
                              value={batchStartNumber}
                              onChange={(event) => setBatchStartNumber(event.target.value)}
                              placeholder="1"
                            />
                          </label>
                        )}
                      </div>

                      {batchFiles.length > 0 && (
                        <div className="admin-batch-list">
                          {batchFiles.map((file, index) => (
                            <label key={`${file.name}-${index}`} className="admin-batch-item">
                              <input
                                type="checkbox"
                                checked={batchSelected.has(index)}
                                onChange={() => toggleBatchFile(index)}
                              />
                              <div>
                                <div className="admin-batch-name">{file.name}</div>
                                <div className="admin-batch-meta">
                                  {formatSize(file.size)}
                                </div>
                              </div>
                            </label>
                          ))}
                        </div>
                      )}

                      {batchError && (
                        <div className="admin-upload-error">{batchError}</div>
                      )}
                      {batchSuccess && (
                        <div className="admin-upload-success">{batchSuccess}</div>
                      )}

                      {batchUploading && (
                        <div className="admin-upload-hint">
                          Загружено {batchProgress.done} из {batchProgress.total}
                        </div>
                      )}

                      <div className="admin-upload-actions">
                        <button
                          className="admin-button"
                          type="submit"
                          disabled={batchUploading || batchSelected.size === 0}
                        >
                          {batchUploading ? "Загрузка..." : "Загрузить выбранные"}
                        </button>
                      </div>
                    </form>
                  </div>
                </section>
              )}

              {activeSection === "moderation-reports" && (
                <section className="admin-card">
                  <h2>Жалобы</h2>
                  <p>Скоро: очередь жалоб и модерация контента.</p>
                </section>
              )}
            </div>
          </section>
        </main>
      </div>
    </>
  );
}
