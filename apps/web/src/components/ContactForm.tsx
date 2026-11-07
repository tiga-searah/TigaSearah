import { type SubmitEvent, useEffect, useRef, useState } from "react";
import { contactSchema, services } from "@tiga-searah/shared/contact";

type Errors = Partial<Record<string, string>>;
export default function ContactForm() {
	const [service, setService] = useState("");
	const [errors, setErrors] = useState<Errors>({});
	const [status, setStatus] = useState<
		"idle" | "submitting" | "success" | "error"
	>("idle");
	const [notice, setNotice] = useState("");
	const inFlight = useRef(false);
	const controller = useRef<AbortController | null>(null);

	useEffect(() => {
		const select = (value: string | null) => {
			if (services.includes(value as (typeof services)[number]))
				setService(value!);
		};
		select(new URLSearchParams(location.search).get("service"));
		const handle = (event: Event) =>
			select((event as CustomEvent<string>).detail);
		window.addEventListener("select-service", handle);
		return () => {
			window.removeEventListener("select-service", handle);
			controller.current?.abort();
		};
	}, []);

	async function submit(event: SubmitEvent<HTMLFormElement>) {
		event.preventDefault();
		if (inFlight.current) return;
		const form = event.currentTarget;
		const formData = new FormData(form);
		const result = contactSchema.safeParse({
			...Object.fromEntries(formData),
			consent: formData.get("consent") === "on",
		});
		if (!result.success) {
			const nextErrors: Errors = {};
			result.error.issues.forEach((issue) => {
				nextErrors[String(issue.path[0])] ??= issue.message;
			});
			setErrors(nextErrors);
			setStatus("idle");
			setNotice("Periksa kembali kolom yang ditandai.");
			const field = form.elements.namedItem(Object.keys(nextErrors)[0]);
			if (field instanceof HTMLElement) field.focus();
			return;
		}
		setErrors({});
		setStatus("submitting");
		setNotice("");
		inFlight.current = true;
		const payload = JSON.stringify(result.data);
		controller.current = new AbortController();
		const timeout = setTimeout(() => controller.current?.abort(), 20000);
		try {
			const response = await fetch("/api/contact", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: payload,
				signal: controller.current.signal,
			});
			const data = await response.json();
			if (!response.ok || data.success !== true) {
				setErrors(data.errors || {});
				throw new Error(
					data.message ||
						"Pesan belum terkirim. Coba lagi atau hubungi kami lewat email.",
				);
			}
			setStatus("success");
			setNotice(
				"Pesanmu sudah terkirim. Terima kasih sudah berbagi ide. Kami akan membalas melalui emailmu.",
			);
			form.reset();
			setService("");
		} catch (error) {
			setStatus("error");
			setNotice(
				error instanceof Error && error.name !== "AbortError"
					? error.message
					: "Koneksi terputus atau waktu tunggu habis. Isianmu tetap tersimpan di formulir. Coba lagi atau kirim email langsung.",
			);
		} finally {
			clearTimeout(timeout);
			inFlight.current = false;
		}
	}

	const errorProps = (field: string) => ({
		"aria-invalid": !!errors[field],
		"aria-describedby": errors[field] ? `${field}-error` : undefined,
	});
	const error = (field: string) =>
		errors[field] ? (
			<span className="field-error text-rose-300 text-[10px] mt-1.5 block" id={`${field}-error`}>
				{errors[field]}
			</span>
		) : null;

	const inputClass =
		"w-full border-0 border-b border-white/15 [.light-theme_&]:border-slate-300 rounded-none bg-transparent text-text px-0.5 pt-2.5 pb-3 text-xs min-h-[44px] transition-colors focus:outline-none focus:border-b-blue-400 focus:shadow-[0_1px_0_#60a5fa] placeholder:text-slate-500 aria-[invalid=true]:border-rose-400";
	const labelClass =
		"text-[11px] mb-2.5 text-slate-300 [.light-theme_&]:text-slate-700 font-semibold";

	return (
		<form
			className="contact-form relative bg-white/[0.02] border-2 border-white/[0.08] [.light-theme_&]:bg-white [.light-theme_&]:border-slate-200 rounded-[20px] p-6 sm:p-9 backdrop-blur-md shadow-[0_8px_0_rgba(0,0,0,0.3)] [.light-theme_&]:shadow-lg"
			method="post"
			action="/api/contact"
			onSubmit={submit}
			noValidate
			aria-label="Formulir permintaan proyek"
			aria-busy={status === "submitting"}
		>
			<p className="form-heading flex items-center justify-between gap-4 font-display text-[17px] font-bold tracking-tight mb-7 text-text">
				Mulai dari sebuah percakapan.<span className="font-sans text-[9px] font-normal text-muted tracking-normal">* Wajib diisi</span>
			</p>
			<div className="form-grid grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-x-5.5 sm:gap-y-6">
				<div className="form-field flex flex-col min-w-0">
					<label htmlFor="name" className={labelClass}>
						Nama kamu <span className="text-blue">*</span>
					</label>
					<input
						id="name"
						name="name"
						autoComplete="name"
						placeholder="Nama lengkap"
						required
						maxLength={100}
						className={inputClass}
						{...errorProps("name")}
					/>
					{error("name")}
				</div>
				<div className="form-field flex flex-col min-w-0">
					<label htmlFor="email" className={labelClass}>
						Email <span className="text-blue">*</span>
					</label>
					<input
						id="email"
						name="email"
						type="email"
						autoComplete="email"
						placeholder="kamu@email.com"
						required
						maxLength={254}
						className={inputClass}
						{...errorProps("email")}
					/>
					{error("email")}
				</div>
				<div className="form-field flex flex-col min-w-0">
					<label htmlFor="company" className={labelClass}>
						Bisnis / organisasi <span className="text-[8px] text-muted ml-1.5">Opsional</span>
					</label>
					<input
						id="company"
						name="company"
						autoComplete="organization"
						placeholder="Nama bisnis atau organisasi"
						maxLength={150}
						className={inputClass}
						{...errorProps("company")}
					/>
					{error("company")}
				</div>
				<div className="form-field flex flex-col min-w-0">
					<label htmlFor="service" className={labelClass}>
						Yang kamu butuhkan <span className="text-blue">*</span>
					</label>
					<select
						id="service"
						name="service"
						required
						value={service}
						onChange={(event) => setService(event.target.value)}
						className="w-full border-0 border-b border-white/15 [.light-theme_&]:border-slate-300 rounded-none bg-transparent text-slate-300 [.light-theme_&]:text-slate-700 px-0.5 pt-2.5 pb-3 pr-6 text-xs min-h-[44px] transition-colors focus:outline-none focus:border-b-blue-400 focus:shadow-[0_1px_0_#60a5fa] aria-[invalid=true]:border-rose-400 [&_option]:bg-[#111318] [&_option]:text-[#f4f5f1]"
						{...errorProps("service")}
					>
						<option value="" disabled>
							Pilih layanan
						</option>
						{services.map((item) => (
							<option key={item} value={item}>
								{item === "Other / Not Sure Yet"
									? "Lainnya / Belum yakin"
									: item}
							</option>
						))}
					</select>
					{error("service")}
				</div>
				<div className="form-field flex flex-col min-w-0">
					<label htmlFor="budget" className={labelClass}>
						Gambaran anggaran <span className="text-[8px] text-muted ml-1.5">Opsional</span>
					</label>
					<input
						id="budget"
						name="budget"
						placeholder="Boleh kita diskusikan dulu"
						maxLength={100}
						className={inputClass}
						{...errorProps("budget")}
					/>
					{error("budget")}
				</div>
				<div className="form-field flex flex-col min-w-0">
					<label htmlFor="timeline" className={labelClass}>
						Target waktu <span className="text-[8px] text-muted ml-1.5">Opsional</span>
					</label>
					<input
						id="timeline"
						name="timeline"
						placeholder="Kapan ingin mulai atau selesai?"
						maxLength={150}
						className={inputClass}
						{...errorProps("timeline")}
					/>
					{error("timeline")}
				</div>
				<div className="form-field flex flex-col min-w-0 sm:col-span-2">
					<label htmlFor="message" className={labelClass}>
						Ceritakan idemu <span className="text-blue">*</span>
					</label>
					<textarea
						id="message"
						name="message"
						rows={4}
						placeholder="Tentang proyek, tujuan, dan hal yang ingin kamu wujudkan…"
						required
						minLength={20}
						maxLength={5000}
						className="w-full border-0 border-b border-white/15 [.light-theme_&]:border-slate-300 rounded-none bg-transparent text-text px-0.5 pt-2.5 pb-3 text-xs min-h-[110px] resize-y transition-colors focus:outline-none focus:border-b-blue-400 focus:shadow-[0_1px_0_#60a5fa] placeholder:text-slate-500 aria-[invalid=true]:border-rose-400"
						{...errorProps("message")}
					/>
					{error("message")}
				</div>
			</div>
			<div className="honeypot absolute w-px h-px p-0 -m-px overflow-hidden clip-[rect(0,0,0,0)] whitespace-nowrap border-0 pointer-events-none opacity-0" aria-hidden="true">
				<label htmlFor="website">Website</label>
				<input id="website" name="website" tabIndex={-1} autoComplete="off" />
			</div>
			<label className="consent-label flex items-start gap-2.5 mt-5.5 text-muted text-[10px] leading-relaxed cursor-pointer">
				<input
					name="consent"
					type="checkbox"
					required
					className="w-4 h-4 accent-blue-500 shrink-0 mt-0.5"
					{...errorProps("consent")}
				/>
				<span>
					Saya setuju data ini digunakan untuk menanggapi kebutuhan proyek
					sesuai <a href="/privacy-policy/" className="underline underline-offset-[3px] text-blue">kebijakan privasi</a>.
				</span>
			</label>
			{error("consent")}
			<button
				className="button button-blue form-submit w-full mt-6 min-h-[52px] px-6 py-3.5 text-sm font-bold text-white bg-blue-600 border-2 border-blue-500 rounded-2xl shadow-[0_4px_0_#1d4ed8,0_6px_18px_rgba(37,99,235,0.35)] hover:bg-blue-500 hover:border-blue-400 active:translate-y-[3px] active:shadow-[0_1px_0_#1d4ed8] transition-all flex items-center justify-between select-none cursor-pointer disabled:cursor-wait disabled:opacity-65 disabled:hover:bg-blue-600 disabled:hover:border-blue-500 disabled:active:translate-y-0 disabled:active:shadow-[0_4px_0_#1d4ed8]"
				type="submit"
				disabled={status === "submitting"}
			>
				<span>
					{status === "submitting" ? "Mengirim pesan…" : "Kirim cerita proyekmu"}
				</span>
				<svg
					width="20"
					height="20"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
					aria-hidden="true"
				>
					<path d="M7 17 17 7M7 7h10v10" />
				</svg>
			</button>
			<div
				className={`form-notice text-[11px] leading-relaxed mt-3.5 ${status === "success" ? "text-emerald-400" : status === "error" ? "text-rose-400" : "text-slate-400"}`}
				role="status"
				aria-live="polite"
				aria-atomic="true"
			>
				{notice}
				{status === "error" && (
					<a href="mailto:trio.searah@gmail.com" className="block mt-1.5 underline text-blue">
						Email trio.searah@gmail.com ↗
					</a>
				)}
			</div>
			<noscript>
				<p className="mt-4 text-xs text-muted">
					Formulir membutuhkan JavaScript. Kirim kebutuhan proyek langsung ke{" "}
					<a href="mailto:trio.searah@gmail.com" className="text-blue underline">trio.searah@gmail.com</a>.
				</p>
			</noscript>
		</form>
	);
}
