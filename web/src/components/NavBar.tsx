import { Disclosure, DisclosureButton, DisclosurePanel, Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react'
import { Menu as Bars3Icon, X as XMarkIcon, Building2 } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { getImagePath } from '@/utils/imagePath';

const getNavigation = () => [
    { name: 'Events', href: '/admin' },
    { name: 'Guests', href: '/admin/guests' },
    { name: 'Sponsors', href: '/admin/sponsors' },
];

function classNames(...classes: string[]) {
    return classes.filter(Boolean).join(' ')
}

export default function NavBar() {
    const location = useLocation();
    const [logo, setLogo] = useState<string | null>(null);
    const token = localStorage.getItem('token');
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        const userStr = localStorage.getItem('user');
        if (userStr) {
            const user = JSON.parse(userStr);
            setIsAdmin(user.type === 'admin');
        }
        const fetchLogo = async () => {
            try {
                const res = await axios.get('/api/admin/company', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (res.data?.logo) {
                    setLogo(res.data.logo);
                }
            } catch (err) {
                // Non-critical: logo simply won't appear if unavailable
                console.debug('Company logo not available');
            }
        };
        fetchLogo();
    }, [token]);

    const navigation = getNavigation();

    return (
        <Disclosure as="nav" className="relative bg-gray-700">
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
                            ) : (
                                <div className="h-8 w-8 bg-gray-600 rounded flex items-center justify-center text-white">
                                    <Building2 size={20} />
                                </div>
                            )}
                        </div>
                        <div className="hidden sm:ml-6 sm:block">
                            <div className="flex space-x-4">
                                {navigation.map((item) => {
                                    const isActive = location.pathname === item.href || (item.href !== '/admin' && location.pathname.startsWith(item.href));
                                    return (
                                        <Link
                                            key={item.name}
                                            to={item.href}
                                            className={classNames(
                                                isActive ? 'bg-gray-900 text-white' : 'text-gray-300 hover:bg-white/5 hover:text-white',
                                                'rounded-md px-3 py-2 text-sm font-medium',
                                            )}
                                        >
                                            {item.name}
                                        </Link>
                                    );
                                })}
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
                            <MenuButton className="cursor-pointer relative flex rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500">
                                <span className="absolute -inset-1.5" />
                                <span className="sr-only">Open sompany menu</span>
                                <span className={classNames(
                                    'rounded-md px-3 py-2 text-sm font-medium text-gray-300',
                                )}>My Company</span>
                            </MenuButton>

                            <MenuItems
                                transition
                                className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white py-1 shadow-lg outline outline-black/5 transition data-closed:scale-95 data-closed:transform data-closed:opacity-0 data-enter:duration-100 data-enter:ease-out data-leave:duration-75 data-leave:ease-in"
                            >
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
                                <MenuItem>
                                    <Link
                                        to="/admin/users"
                                        className="block px-4 py-2 text-sm text-gray-700 data-focus:bg-gray-100 data-focus:outline-hidden"
                                    >
                                        Users
                                    </Link>
                                </MenuItem>
                                <MenuItem>
                                    <Link
                                        to="/login"
                                        onClick={() => {
                                            localStorage.removeItem('token');
                                            localStorage.removeItem('user');
                                        }}
                                        className="block px-4 py-2 text-sm text-gray-700 data-focus:bg-gray-100 data-focus:outline-hidden"
                                    >
                                        Sign out
                                    </Link>
                                </MenuItem>
                            </MenuItems>
                        </Menu>
                    </div>
                </div>
            </div>

            <DisclosurePanel className="sm:hidden">
                <div className="space-y-1 px-2 pt-2 pb-3">
                    {navigation.map((item) => {
                        const isActive = location.pathname === item.href || (item.href !== '/admin' && location.pathname.startsWith(item.href));
                        return (
                            <DisclosureButton
                                key={item.name}
                                as={Link}
                                to={item.href}
                                aria-current={isActive ? 'page' : undefined}
                                className={classNames(
                                    isActive ? 'bg-gray-900 text-white' : 'text-gray-300 hover:bg-white/5 hover:text-white',
                                    'block rounded-md px-3 py-2 text-base font-medium',
                                )}
                            >
                                {item.name}
                            </DisclosureButton>
                        );
                    })}
                </div>
            </DisclosurePanel>
        </Disclosure>
    )
}
