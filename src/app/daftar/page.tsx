import { AuthForm } from "@/components/AuthForm";
import { SiteHeader } from "@/components/SiteHeader";
import { daftar } from "../auth/actions/actions";

export default function DaftarPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-md px-4 py-10">
        <h1 className="mb-6 text-3xl font-extrabold text-cocoa">Daftar akun</h1>
        <AuthForm
          action={daftar}
          submitLabel="Buat akun"
          fields={[
            { name: "nama", label: "Nama lengkap", type: "text", autoComplete: "name" },
            { name: "email", label: "Email", type: "email", autoComplete: "email" },
            { name: "password", label: "Password (min. 8 karakter)", type: "password", autoComplete: "new-password" },
          ]}
          footer={{ text: "Sudah punya akun?", href: "/masuk", link: "Masuk" }}
        />
      </main>
    </>
  );
}
