"use client";

import { useEffect, useState } from "react";

export default function Home() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetch("/api/health")
      .then(res => res.json())
      .then(setData);
  }, []);

  return (
    <main style={{ padding: 20 }}>
      <h1>Frontend ↔ Backend</h1>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </main>
  );
}
