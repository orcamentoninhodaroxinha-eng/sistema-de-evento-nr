export default function AuthSplash() {
  return (
    <div className="fixed inset-0 bg-white dark:bg-slate-950 flex flex-col items-center justify-center z-50" style={{ paddingTop: "env(safe-area-inset-top)" }}>
      <div className="flex flex-col items-center gap-8">
        <img
          src="https://media.base44.com/images/public/69cbd80727489d185bf14962/7cb5516e1_download.png"
          alt="Ninho da Roxinha"
          className="w-32 h-32 object-contain"
        />
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-foreground">Ninho da Roxinha</h1>
          <p className="text-sm text-muted-foreground">Sistema de Confirmação de Evento</p>
        </div>
      </div>
    </div>
  );
}