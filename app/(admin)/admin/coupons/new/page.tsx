// app/admin/coupons/new/page.tsx
import NewCouponForm from "@/components/admin/NewCouponForm";

export const dynamic = "force-dynamic";

export default function NewCouponPage() {
  return (
    <div className="p-6 max-w-lg mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Create New Coupon</h1>
      <NewCouponForm />
    </div>
  );
}
