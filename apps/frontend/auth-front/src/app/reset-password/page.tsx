import { Suspense } from 'react';
import { AuthLayout } from '../../components/AuthLayout';
import { ResetPasswordForm } from '../../components/ResetPasswordForm';

// useSearchParams requiere Suspense en Next.js App Router.
export default function Page() {
  return (
    <AuthLayout>
      <Suspense fallback={null}>
        <ResetPasswordForm />
      </Suspense>
    </AuthLayout>
  );
}
