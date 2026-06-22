import { Disclosure, DisclosureButton, DisclosurePanel, Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react'
import { Menu as Bars3Icon, X as XMarkIcon, Building2, CalendarDays, Users, LogOut, ChevronDown, Scan } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { getImagePath } from '@/utils/imagePath';
import UserModal from '@/components/UserModal';

const getNavigation = () => [
    { name: 'Events', href: '/admin', icon: <CalendarDays size={16} /> },
    { name: 'Guests', href: '/admin/guests', icon: <Users size={16} /> },
    { name: 'Sponsors', href: '/admin/sponsors', icon: <Building2 size={16} /> },
];

function classNames(...classes: string[]) {
    return classes.filter(Boolean).join(' ')
}

export default function NavBar() {
    const location = useLocation();
    const [logo, setLogo] = useState<string | null>(null);
    const token = localStorage.getItem('token');
    const [isSuperAdmin, setIsSuperAdmin] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
    const [isManager, setIsManager] = useState(false);
    const [isUser, setIsUser] = useState(false);
    const [userName, setUserName] = useState('My Profile');
    const [userObj, setUserObj] = useState<any>(null);
    const [companyInfo, setCompanyInfo] = useState<any>(null);
    const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
    const [localUserId, setLocalUserId] = useState<number | null>(null);

    useEffect(() => {
        const userStr = localStorage.getItem('user');
        if (userStr) {
            const user = JSON.parse(userStr);
            setLocalUserId(user.id ?? null);
            setUserObj(user);
            setIsSuperAdmin(user.type === 'superadmin');
            setIsAdmin(user.type === 'admin');
            setIsManager(user.type === 'manager');
            setIsUser(user.type === 'user');
            setUserName(`${user.name || ''} ${user.surname || ''}`.trim() || 'My Profile');

            // Superadmin has no company_id — skip logo/company fetch
            if (user.type === 'superadmin') return;
        }
        const fetchData = async () => {
            try {
                const res = await axios.get('/api/admin/companies', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setCompanyInfo(res.data);
                if (res.data?.logo) {
                    console.log('Company logo found:', res.data.logo);
                    setLogo(res.data.logo);
                }
            } catch (err) {
                console.debug('Company data not available');
            }
        };
        fetchData();
    }, [token]);

    const fetchFullUser = async () => {
        if (!localUserId) return null;
        try {
            console.log("localUserId: ", localUserId);
            const res = await axios.get(`/api/admin/users/${localUserId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            console.log("data from navbar: ", res.data);
            setUserObj(res.data);
            return res.data;
        } catch {
            // Fallback to localStorage data
            return userObj;
        }
    };

    const handleOpenEditProfile = async () => {
        await fetchFullUser();
        setIsEditProfileOpen(true);
    };

    const handleProfileSave = async () => {
        // Re-fetch to refresh both the modal data and the displayed name
        try {
            if (localUserId) {
                const res = await axios.get(`/api/admin/users/${localUserId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const updated = res.data;
                setUserObj(updated);
                setUserName(`${updated.name || ''} ${updated.surname || ''}`.trim() || 'My Profile');
                // Persist updated name/surname back to localStorage
                const stored = JSON.parse(localStorage.getItem('user') || '{}');
                localStorage.setItem('user', JSON.stringify({ ...stored, ...updated }));
            }
        } catch {
            const userStr = localStorage.getItem('user');
            if (userStr) {
                const user = JSON.parse(userStr);
                setUserName(`${user.name || ''} ${user.surname || ''}`.trim() || 'My Profile');
            }
        }
    };

    const navigation = getNavigation();

    return (
        <>
            <Disclosure as="nav" className="relative border-b border-white/10 backdrop-blur-sm bg-black/20 sticky top-0 z-50">
                <div className="mx-auto px-2 sm:px-6 lg:px-8">
                    <div className="relative flex h-16 items-center justify-between">
                        <div className="absolute inset-y-0 left-0 flex items-center sm:hidden">
                            {/* Mobile menu button*/}
                            <DisclosureButton className="group relative inline-flex items-center justify-center rounded-md p-2 text-gray-400 hover:bg-white/5 hover:text-white focus:outline-2 focus:-outline-offset-1 focus:outline-indigo-500">
                                <span className="absolute -inset-0.5" />
                                <span className="sr-only">Open main menu</span>
                                <Bars3Icon aria-hidden="true" className="block size-6 group-data-open:hidden" />
                                <XMarkIcon aria-hidden="true" className="hidden size-6 group-data-open:block" />
                            </DisclosureButton>
                        </div>
                        <div className="flex flex-1 items-center justify-center sm:items-stretch sm:justify-start">
                            <div className="flex shrink-0 items-center">
                                {logo ? (
                                    <img
                                        alt="Company Logo"
                                        src={getImagePath(logo, 'company')}
                                        className="h-8 w-auto rounded"
                                    />
                                ) : isSuperAdmin ? (
                                    <div className="h-8 w-8 bg-gray-600 rounded flex items-center justify-center text-white">
                                        <img src='/logo_entrypoint.png' alt="Superadmin Logo" className="w-12 hidden" />
                                    </div>
                                ) : (
                                    <div className="h-8 w-8 bg-gray-600 rounded flex items-center justify-center text-white">
                                        <img src={logo ? getImagePath(logo, 'company') : '/logo_entrypoint.png'} alt="Company Logo" className="w-12 hidden" />
                                    </div>
                                )}
                            </div>
                            <div className="hidden sm:ml-6 sm:block">
                                <div className="flex space-x-4">
                                    {(isAdmin || isManager) && navigation.map((item) => {
                                        const isActive = location.pathname === item.href || (item.href !== '/admin' && location.pathname.startsWith(item.href));
                                        return (
                                            <div key={item.name} className="flex items-center gap-1">
                                                <Link
                                                    to={item.href}
                                                    className={classNames(
                                                        isActive ? 'bg-white/10 text-white font-bold' : 'text-gray-300 hover:bg-white/5 hover:text-white',
                                                        'rounded-md px-3 py-2 text-sm font-medium transition-all flex items-center gap-2 rounded-xl text-sm font-semibold',
                                                    )}
                                                >
                                                    {item.icon}
                                                    {item.name}
                                                </Link>
                                            </div>
                                        );
                                    })}

                                    {(isAdmin || isManager || isUser) && (
                                        <div className="flex items-center gap-1">
                                            <Link
                                                to="/admin/scan"
                                                className={classNames(
                                                    location.pathname === '/admin/scan' ? 'bg-white/10 text-white font-bold' : 'text-gray-300 hover:bg-white/5 hover:text-white',
                                                    'rounded-md px-3 py-2 text-sm font-medium transition-all flex items-center gap-2 rounded-xl text-sm font-semibold',
                                                )}
                                            >
                                                <Scan size={16} />
                                                Scan Access
                                            </Link>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="absolute inset-y-0 right-0 flex items-center pr-2 sm:static sm:inset-auto sm:ml-6 sm:pr-0">
                            <button
                                type="button"
                                className="relative rounded-full p-1 text-gray-400 focus:outline-2 focus:outline-offset-2 focus:outline-indigo-500"
                            >
                                <span className="absolute -inset-1.5" />
                                <span className="sr-only">View notifications</span>
                            </button>

                            {/* Profile dropdown */}
                            <Menu as="div" className="relative ml-3">
                                <MenuButton className="cursor-pointer relative flex rounded-full">
                                    <span className="absolute -inset-1.5" />
                                    <span className="sr-only">Open company menu</span>
                                    <div className='flex gap-2 items-center'>
                                        <div className={classNames('flex items-center gap-1 rounded-md px-2 sm:px-3 py-2 text-sm font-medium text-gray-300 hover:text-white')}>
                                            <div className="max-w-[100px] sm:max-w-[160px] truncate">{userName}</div>
                                            <ChevronDown size={14} className="flex-shrink-0" />
                                        </div>
                                    </div>
                                </MenuButton>
                                <MenuItems
                                    transition
                                    className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white py-1 shadow-lg outline outline-black/5 transition data-closed:scale-95 data-closed:transform data-closed:opacity-0 data-enter:duration-100 data-enter:ease-out data-leave:duration-75 data-leave:ease-in"
                                >
                                    {(isAdmin || isManager) && (
                                        <MenuItem>
                                            <button
                                                onClick={handleOpenEditProfile}
                                                className="w-full text-left block px-4 py-2 text-sm text-gray-700 data-focus:bg-gray-100 data-focus:outline-hidden cursor-pointer"
                                            >
                                                Edit Profile
                                            </button>
                                        </MenuItem>
                                    )}
                                    {isAdmin && (
                                        <MenuItem>
                                            <Link
                                                to="/admin/company/info"
                                                className="block px-4 py-2 text-sm text-gray-700 data-focus:bg-gray-100 data-focus:outline-hidden"
                                            >
                                                Company Info
                                            </Link>
                                        </MenuItem>
                                    )}
                                    {isAdmin && (
                                        <MenuItem>
                                            <Link
                                                to="/admin/users"
                                                className="block px-4 py-2 text-sm text-gray-700 data-focus:bg-gray-100 data-focus:outline-hidden"
                                            >
                                                Users
                                            </Link>
                                        </MenuItem>
                                    )}
                                    <MenuItem>
                                        <Link
                                            to="/login"
                                            onClick={() => {
                                                localStorage.removeItem('token');
                                                localStorage.removeItem('user');
                                            }}
                                            className="flex items-center gap-2 block px-4 py-2 text-sm text-gray-700 data-focus:bg-gray-100 data-focus:outline-hidden"
                                        >
                                            <LogOut size={16} /> Sign out
                                        </Link>
                                    </MenuItem>
                                </MenuItems>
                            </Menu>
                        </div>
                    </div>
                </div>

                <DisclosurePanel className="sm:hidden border-t border-white/10">
                    <div className="space-y-1 px-2 pt-2 pb-3">
                        {(isAdmin || isManager) && navigation.map((item) => {
                            const isActive = location.pathname === item.href || (item.href !== '/admin' && location.pathname.startsWith(item.href));
                            return (
                                <DisclosureButton
                                    key={item.name}
                                    as={Link}
                                    to={item.href}
                                    aria-current={isActive ? 'page' : undefined}
                                    className={classNames(
                                        isActive ? 'bg-white/10 text-white font-bold' : 'text-gray-300 hover:bg-white/5 hover:text-white',
                                        'flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium',
                                    )}
                                >
                                    {item.icon}{item.name}
                                </DisclosureButton>
                            );
                        })}

                        {(isAdmin || isManager || isUser) && (
                            <DisclosureButton
                                as={Link}
                                to="/admin/scan"
                                aria-current={location.pathname === '/admin/scan' ? 'page' : undefined}
                                className={classNames(
                                    location.pathname === '/admin/scan' ? 'bg-white/10 text-white font-bold' : 'text-gray-300 hover:bg-white/5 hover:text-white',
                                    'flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium',
                                )}
                            >
                                <Scan size={16} />Scan Access
                            </DisclosureButton>
                        )}

                        {isAdmin && (
                            <DisclosureButton as={Link} to="/admin/users"
                                className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-300 hover:bg-white/5 hover:text-white">
                                <Users size={16} /> Users
                            </DisclosureButton>
                        )}
                        {isManager && (
                            <DisclosureButton as={Link} to="/admin/users"
                                className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-300 hover:bg-white/5 hover:text-white">
                                <Users size={16} /> Users
                            </DisclosureButton>
                        )}
                    </div>
                </DisclosurePanel>
            </Disclosure>

            {isEditProfileOpen && userObj && (
                <UserModal
                    isOpen={isEditProfileOpen}
                    onClose={() => setIsEditProfileOpen(false)}
                    onSave={handleProfileSave}
                    userToEdit={userObj}
                    companyInfo={companyInfo || { name: '', city: '', country: '' }}
                />
            )}
        </>
    )
}
