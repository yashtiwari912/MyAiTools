import { Protect, useClerk, useUser } from '@clerk/clerk-react'
import { Eraser, FileText, Hash, House, Image, LogOut, Scissors, SquarePen, Users } from 'lucide-react';
import React from 'react'
import { NavLink } from 'react-router-dom';

const navItems = [
    { to: '/ai', lable: 'Dashboard', Icon: House },
    { to: '/ai/write-article', lable: 'Write Article', Icon: SquarePen },
    { to: '/ai/blog-titles', lable: 'Blog Titles', Icon: Hash },
    { to: '/ai/generate-images', lable: 'Generate Images', Icon: Image },
    { to: '/ai/remove-background', lable: 'Remove Background', Icon: Eraser },
    { to: '/ai/remove-object', lable: 'Remove Object', Icon: Scissors },
    { to: '/ai/review-resume', lable: 'Review Resume', Icon: FileText },
    { to: '/ai/pdf-summarizer', lable: 'DocuSense', Icon: Users },
    { to: '/ai/community', lable: 'Community', Icon: Users },
]

const Sidebar = ({ sidebar, setSidebar }) => {
    const { user } = useUser();
    const { signOut, openUserProfile } = useClerk();

    return (
        <div
            className={`w-64 bg-white border-r border-gray-200 flex flex-col justify-between 
                max-sm:absolute top-14 bottom-0  
                ${sidebar ? 'translate-x-0' : 'max-sm:-translate-x-full'} 
                transition-all duration-300 ease-in-out shadow-md`}
        >
            {/* Top Section */}
            <div className="my-7 px-5 w-full overflow-y-auto">
                <img
                    src={user.imageUrl}
                    alt="User avatar"
                    className='w-16 h-16 object-cover rounded-full mx-auto shadow'
                />
                <h1 className="mt-2 text-center font-semibold">{user.fullName}</h1>

                <div className="mt-8 space-y-2">
                    {navItems.map(({ to, lable, Icon }) => (
                        <NavLink
                            key={to}
                            to={to}
                            end={to === '/ai'}
                            onClick={() => setSidebar(false)}
                            className={({ isActive }) => `
                                px-5 py-2.5 flex items-center gap-4 rounded-lg transition-all
                                ${isActive
                                    ? 'bg-gradient-to-r from-[#3C81F6] to-[#9234EA] text-white shadow-md'
                                    : 'hover:bg-gray-100 text-gray-700'
                                }
                            `}
                        >
                            <Icon className="w-5 h-5" />
                            <span className="text-sm font-medium">{lable}</span>
                        </NavLink>
                    ))}
                </div>
            </div>

            {/* Bottom Section */}
            <div className='w-full border-t border-gray-200 px-5 py-4 flex items-center justify-between'>
                <div
                    onClick={openUserProfile}
                    className='flex gap-3 items-center cursor-pointer hover:bg-gray-50 rounded-lg p-2 transition'
                >
                    <img
                        src={user.imageUrl}
                        alt=""
                        className="w-10 h-10 rounded-full shadow"
                    />
                    <div>
                        <h1 className="text-sm font-medium">{user.fullName}</h1>
                        <p className='text-xs text-gray-500'>
                            <Protect plan='premium' fallback="Free">Premium</Protect> plan
                        </p>
                    </div>
                </div>
                <LogOut
                    onClick={signOut}
                    className='w-5 text-gray-400 hover:text-red-500 transition cursor-pointer'
                />
            </div>
        </div>
    )
}

export default Sidebar
