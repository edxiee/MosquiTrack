import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus } from "lucide-react";

interface UserToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  role: string;
  onRoleChange: (value: string) => void;
  status: string;
  onStatusChange: (value: string) => void;
  municipality: string;
  onMunicipalityChange: (value: string) => void;
  municipalityOptions: string[];
  barangay: string;
  onBarangayChange: (value: string) => void;
  barangayOptions: string[];
  onCreateUser: () => void;
}

export default function UserToolbar({
  search,
  onSearchChange,
  role,
  onRoleChange,
  status,
  onStatusChange,
  municipality,
  onMunicipalityChange,
  municipalityOptions,
  barangay,
  onBarangayChange,
  barangayOptions,
  onCreateUser,
}: UserToolbarProps) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      {/* Left Section */}
      <div className="flex flex-1 flex-col gap-4 md:flex-row md:flex-wrap">
        {/* Search */}
        <Input
          placeholder="Search by name, email, or phone..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full md:max-w-sm"
        />
        {/* Role Filter */}
        <Select value={role} onValueChange={onRoleChange}>
          <SelectTrigger className="w-full md:w-56">
            <SelectValue placeholder="All Roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="SYS_ADMIN">System Administrator</SelectItem>
            <SelectItem value="MHO">Municipal Health Officer</SelectItem>
            <SelectItem value="BHW">Barangay Health Worker</SelectItem>
          </SelectContent>
        </Select>
        {/* Status Filter */}
        <Select value={status} onValueChange={onStatusChange}>
          <SelectTrigger className="w-full md:w-48">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
          </SelectContent>
        </Select>
        {/* Municipality Filter */}
        <Select value={municipality} onValueChange={onMunicipalityChange}>
          <SelectTrigger className="w-full md:w-52">
            <SelectValue placeholder="All Municipalities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Municipalities</SelectItem>
            {municipalityOptions.map((name) => (
              <SelectItem key={name} value={name}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {/* Barangay Filter */}
        <Select value={barangay} onValueChange={onBarangayChange}>
          <SelectTrigger className="w-full md:w-48">
            <SelectValue placeholder="All Barangays" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Barangays</SelectItem>
            {barangayOptions.map((name) => (
              <SelectItem key={name} value={name}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {/* Right Section */}
      <Button onClick={onCreateUser}>
        <Plus className="mr-2 h-4 w-4" />
        Create User
      </Button>
    </div>
  );
}