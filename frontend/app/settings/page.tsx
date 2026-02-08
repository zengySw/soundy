"use client";

import Header from "@/components/Header/Header";

export default function SettingsPage() {
  return (
    <>
      <div className="bg-gradient" />
      <div className="app">
        <Header />

        <main className="page-main">
          <section className="page-hero settings-hero">
            <div className="page-hero-badge">Профиль</div>
            <h1 className="page-hero-title">Настройки</h1>
            <p className="page-hero-subtitle">
              Управляй приватностью, качеством звука и внешним видом аккаунта.
            </p>
          </section>

          <section className="settings-grid">
            <div className="settings-card">
              <h2 className="settings-card-title">Аккаунт</h2>
              <div className="settings-item">
                <span>Почта</span>
                <span className="settings-item-value">user@mail.com</span>
              </div>
              <div className="settings-item">
                <span>План</span>
                <span className="settings-item-value">Free</span>
              </div>
              <button className="settings-action" type="button">
                Изменить данные
              </button>
            </div>

            <div className="settings-card">
              <h2 className="settings-card-title">Звук</h2>
              <div className="settings-item">
                <span>Качество стрима</span>
                <span className="settings-item-value">Высокое</span>
              </div>
              <div className="settings-item">
                <span>Нормализация</span>
                <span className="settings-item-value">Вкл.</span>
              </div>
              <button className="settings-action" type="button">
                Открыть настройки
              </button>
            </div>

            <div className="settings-card">
              <h2 className="settings-card-title">Приватность</h2>
              <div className="settings-item">
                <span>Публичный профиль</span>
                <span className="settings-item-value">Открыт</span>
              </div>
              <div className="settings-item">
                <span>История прослушиваний</span>
                <span className="settings-item-value">Доступна</span>
              </div>
              <button className="settings-action" type="button">
                Управлять
              </button>
            </div>
          </section>
        </main>
      </div>
    </>
  );
}
