import Link from 'next/link';

const PLANS = [
  { name: 'Weekly', price: 479 },
  { name: 'Monthly', price: 1399 },
  { name: 'Annual', price: 12999 },
];

export default function LandingPage() {
  return (
    <main className="min-h-screen flex flex-col items-center px-4 py-16">
      <h1 className="text-3xl font-black mb-2 text-center">Princex Markets Analysis</h1>
      <p className="text-white/60 text-center mb-10">
        Precision signals for Deriv Rise/Fall trading
      </p>

      <div className="flex gap-3 mb-12">
        <Link
          href="/signup"
          className="bg-accent text-black font-bold px-6 py-3 rounded-lg"
        >
          Sign Up
        </Link>
        <Link
          href="/login"
          className="border border-accent text-accent font-bold px-6 py-3 rounded-lg"
        >
          Log In
        </Link>
      </div>

      <div className="grid gap-4 w-full max-w-md">
        {PLANS.map((plan) => (
          <div
            key={plan.name}
            className="border border-white/10 bg-[#111] rounded-xl p-4 flex justify-between items-center"
          >
            <span className="font-bold">{plan.name}</span>
            <span className="text-accent font-bold">KES {plan.price.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </main>
  );
}
