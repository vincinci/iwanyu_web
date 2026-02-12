import StorefrontPage from "@/components/StorefrontPage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/auth";
import { Link } from "react-router-dom";

export default function SellerSettingsPage() {
  const { user } = useAuth();

  return (
    <StorefrontPage>
      <div className="container py-8 max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
            <div>
                <h1 className="text-3xl font-semibold text-gray-900">Store Settings</h1>
                <p className="text-gray-500">Manage your store profile and preferences.</p>
            </div>
            <Link to="/seller">
                <Button variant="outline">Back to Dashboard</Button>
            </Link>
        </div>

        <div className="space-y-8">
            {/* General Information */}
            <div className="rounded-2xl border border-gray-200 bg-white p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Store Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Store Name</label>
                        <Input defaultValue={`${user?.name}'s Shop`} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Support Email</label>
                        <Input defaultValue={user?.email || ""} />
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Store Description</label>
                        <textarea className="w-full min-h-[100px] rounded-xl border border-gray-200 bg-white p-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/20" placeholder="Describe your store..." />
                    </div>
                </div>
            </div>

            {/* Branding */}
            <div className="rounded-2xl border border-gray-200 bg-white p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Branding</h2>
                <div className="flex items-center gap-6">
                    <div className="h-24 w-24 rounded-full bg-gray-100 border border-dashed border-gray-300 flex items-center justify-center text-gray-400 text-xs">
                        Upload Logo
                    </div>
                    <div className="flex-1 h-32 rounded-xl bg-gray-100 border border-dashed border-gray-300 flex items-center justify-center text-gray-400 text-xs">
                        Upload Banner Image
                    </div>
                </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end pt-4">
                <Button className="bg-gray-900 text-white hover:bg-gray-800 rounded-full px-8">Save Changes</Button>
            </div>
        </div>
      </div>
    </StorefrontPage>
  );
}
