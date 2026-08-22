import { Suspense } from 'react';
import { AuthLayout } from '../../components/AuthLayout';
import { ActivateForm } from '../../components/ActivateForm';

// useSearchParams requiere Suspense en Next.js App Router.
export default function Page() {
  return (
    <AuthLayout>
      <Suspense fallback={null}>
        <ActivateForm />
      </Suspense>
    </AuthLayout>
  );
}
