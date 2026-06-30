import { AuthLayout } from '../../components/AuthLayout';
import { RegisterForm } from '../../components/RegisterForm';

export default function Page() {
  return (
    <AuthLayout>
      <RegisterForm />
    </AuthLayout>
  );
}
