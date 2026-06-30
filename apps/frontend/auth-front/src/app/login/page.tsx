import { AuthLayout } from '../../components/AuthLayout';
import { LoginForm } from '../../components/LoginForm';

export default function Page() {
  return (
    <AuthLayout>
      <LoginForm />
    </AuthLayout>
  );
}
