import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Lock } from 'lucide-react';
import { api, adminToken } from '../../lib/api.js';
import { Logo, Seo, Spinner } from '../../components/ui.jsx';
import Snowfall from '../../components/Snowfall.jsx';

export default function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  if (adminToken.get()) return <Navigate to="/admin" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await api('/admin/login', { method: 'POST', body: { email, password } });
      adminToken.set(res.token);
      navigate('/admin', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grain relative grid min-h-screen place-items-center overflow-hidden bg-forest px-4 text-cream">
      <Seo title="Admin login" noindex />
      <Snowfall />
      <motion.form
        onSubmit={submit}
        initial={{ opacity: 0, y: 30, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-sm rounded-[2rem] bg-cream p-8 text-ink shadow-2xl"
      >
        <motion.div initial={{ rotate: -180, scale: 0 }} animate={{ rotate: 0, scale: 1 }} transition={{ delay: 0.2, type: 'spring' }} className="-mt-20 mb-4 flex justify-center">
          <Logo size={104} className="h-26 w-26 shadow-xl ring-4 ring-cream" />
        </motion.div>
        <h1 className="text-center text-4xl text-forest">Admin</h1>
        <p className="mb-6 text-center text-sm text-ink/60">Cliff Camps, Barot</p>
        <label htmlFor="email" className="label">Email</label>
        <input id="email" type="email" autoComplete="username" className="field mb-4" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <label htmlFor="password" className="label">Password</label>
        <div className="relative">
          <input id="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" className="field pr-12" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            aria-pressed={showPassword}
            className="absolute inset-y-0 right-1 my-auto grid h-10 w-10 place-items-center rounded-full text-forest/60 transition hover:bg-forest/5 hover:text-forest"
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
        {error && <p role="alert" className="mt-4 rounded-xl bg-pin/10 p-3 text-sm text-pin">{error}</p>}
        <button type="submit" disabled={busy} className="btn-dark mt-6 w-full py-3.5">
          {busy ? <Spinner /> : <Lock size={16} />} Sign in
        </button>
      </motion.form>
    </div>
  );
}
