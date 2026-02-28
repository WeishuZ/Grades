import React from 'react';
import { useContext, useEffect, useState } from 'react';
import {
    AppBar,
    Box,
    Toolbar,
    Typography,
    Button,
    Link,
    Avatar,
    Menu,
    MenuItem,
    IconButton,
    useMediaQuery,
    FormControl,
    Select,
} from '@mui/material';
import {
    LoginOutlined,
    StorageOutlined,
    AccountCircleOutlined,
    AccountTree,
    Warning,
    Logout,
    Settings as SettingsIcon,
} from '@mui/icons-material';
import MenuIcon from '@mui/icons-material/Menu';
import apiv2 from '../utils/apiv2';
import NavBarItem from './NavBarItem';
import NavMenuItem from './NavMenuItem';
import { StudentSelectionContext } from './StudentSelectionWrapper';

export default function ButtonAppBar() {
    const mobileView = useMediaQuery('(max-width:600px)');
    const [loggedIn, setLoginStatus] = useState(
        !!localStorage.getItem('token'),
    );
    const { setSelectedStudent } = useContext(StudentSelectionContext);
    const [isAdmin, setAdminStatus] = useState(false);
    const [profilePicture, updateProfilePicture] = useState('');
    const tabList = [
        {
            name: 'Profile',
            href: '/profile',
            icon: <AccountCircleOutlined />,
        },
    ];
    const [tabs, updateTabs] = useState(tabList.slice(1));
    const [anchorEl, setAnchorEl] = useState(null);

    useEffect(() => {
        let mounted = true;
        if (loggedIn) {
            updateTabs(tabList);
            updateProfilePicture(localStorage.getItem('profilepicture'));

            // Check for admin status when user is logged in
            apiv2.get(`/isadmin?_=${new Date().getTime()}`)
                .then((res) => {
                    if (mounted) {
                        setAdminStatus(res.data.isAdmin === true);
                    }
                })
                .catch((err) => {
                    console.error("Failed to verify admin status.", err);
                    if (mounted) {
                        setAdminStatus(false);
                    }
                });
        } else {
            // Ensure user is not admin if not logged in
            setAdminStatus(false);
        }
        return () => { mounted = false; };
    }, [loggedIn]);

    function renderMenuItems() {
        // Start with base tabs for all logged-in users
        const menuItems = [...tabs];
        
        // If admin, add admin-specific tabs
        if (isAdmin) {
            menuItems.push(
                { name: 'Grade Sync', href: '/gradesync', icon: <StorageOutlined /> },
                { name: 'Admin', href: '/admin', icon: <AccountTree /> },
                { name: 'Alerts', href: '/alerts', icon: <Warning /> }
            );
        }

        return menuItems.map((tab) => (
            <NavMenuItem
                key={tab.name}
                icon={tab.icon}
                text={tab.name}
                onClick={() => {
                    window.location.href = tab.href;
                }}
            />
        ));
    }

    // Set up handlers for user menu
    function handleMenu(e) {
        setAnchorEl(e.currentTarget);
    }
    function handleClose() {
        setAnchorEl(null);
    }
    function doLogout() {
        localStorage.setItem('token', '');
        localStorage.setItem('email', '');
        setLoginStatus(false);
        window.location.reload(false);
    }

    const [courses, setCourses] = useState([]);
    const [selectedCourse, setSelectedCourse] = useState(
        localStorage.getItem('selectedCourseId') || '',
    );
    useEffect(() => {
        let mounted = true;
        if (isAdmin) {
            apiv2.get('/students').then((res) => {
                if (mounted) {
                    const sortedStudents = res.data.students.sort((a, b) =>
                        a[0].localeCompare(b[0])
                    );
                    if (sortedStudents.length > 0) {
                        setSelectedStudent(sortedStudents[0][1]);
                    }
                }
            });

            apiv2.get('/admin/sync')
                .then((res) => {
                    if (!mounted) return;

                    const fetchedCourses = res?.data?.courses || [];
                    setCourses(fetchedCourses);

                    if (fetchedCourses.length === 0) return;

                    const hasSelected = fetchedCourses.some((course) => course.id === selectedCourse);
                    const nextCourse = hasSelected ? selectedCourse : fetchedCourses[0].id;

                    setSelectedCourse(nextCourse);
                    localStorage.setItem('selectedCourseId', nextCourse);
                    window.dispatchEvent(new CustomEvent('selectedCourseChanged', {
                        detail: { courseId: nextCourse },
                    }));
                })
                .catch((err) => {
                    console.error('Failed to load courses in navbar:', err);
                });
        }
        return () => (mounted = false);
    }, [isAdmin, selectedCourse, setSelectedStudent]);

    useEffect(() => {
        let mounted = true;
        if (loggedIn) {
            apiv2.get('/isadmin')
                .then((res) => {
                    if (mounted) {
                        setAdminStatus(res.data.isAdmin);
                    }
                })
                .catch((err) => {
                    if (mounted) {
                        console.error('Failed to check admin status:', err);
                        setAdminStatus(false);
                    }
                });
        }
        return () => (mounted = false);
    }, [loggedIn]);

    return (
        <Box sx={{ flexGrow: 1 }}>
            <AppBar position='static'>
                <Toolbar>
                    <Box sx={{ flexGrow: 1, gap: '20px' }} display='flex'>
                        <Typography
                            variant='h6'
                            component='div'
                            display='inline-block'
                        >
                            <a
                                href='/'
                                style={{
                                    textDecoration: 'none',
                                    color: 'inherit',
                                }}
                            >
                                GradeView
                            </a>
                        </Typography>
                        {!mobileView && (
                            <>
                                {loggedIn && (
                                    <NavBarItem href='/profile'>Profile</NavBarItem>
                                )}
                                {isAdmin && (
                                    <>
                                    <NavBarItem href='/gradesync'>Grade Sync</NavBarItem>
                                    <NavBarItem href='/admin'>Admin</NavBarItem>
                                    <NavBarItem href='/alerts'>Alerts</NavBarItem>
                                    </>
                                )}
                            </>
                        )}
                    </Box>
                    {loggedIn ? (
                        <>
                            {isAdmin && courses.length > 0 && (
                                <FormControl
                                    size='small'
                                    sx={{
                                        minWidth: 220,
                                        mr: 1.5,
                                        '& .MuiOutlinedInput-root': {
                                            color: 'white',
                                            '& fieldset': {
                                                borderColor: 'rgba(255,255,255,0.5)',
                                            },
                                            '&:hover fieldset': {
                                                borderColor: 'white',
                                            },
                                            '&.Mui-focused fieldset': {
                                                borderColor: 'white',
                                            },
                                        },
                                        '& .MuiSvgIcon-root': {
                                            color: 'white',
                                        },
                                    }}
                                >
                                    <Select
                                        value={selectedCourse}
                                        displayEmpty
                                        onChange={(e) => {
                                            const nextCourse = e.target.value;
                                            setSelectedCourse(nextCourse);
                                            localStorage.setItem('selectedCourseId', nextCourse);
                                            window.dispatchEvent(new CustomEvent('selectedCourseChanged', {
                                                detail: { courseId: nextCourse },
                                            }));
                                        }}
                                    >
                                        {courses.map((course) => (
                                            <MenuItem key={course.id} value={course.id}>
                                                {course.name} ({course.id})
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            )}
                            <IconButton 
                                aria-label="user profile"
                                onClick={handleMenu}
                            >
                                <Avatar
                                    src={profilePicture}
                                    imgProps={{ referrerPolicy: 'no-referrer' }}
                                />
                            </IconButton>
                            <Menu
                                id='loggedInMenu'
                                anchorEl={anchorEl}
                                anchorOrigin={{
                                    vertical: 'top',
                                    horizontal: 'right',
                                }}
                                keepMounted
                                transformOrigin={{
                                    vertical: 'top',
                                    horizontal: 'right',
                                }}
                                open={Boolean(anchorEl)}
                                onClose={handleClose}
                            >
                                {mobileView && renderMenuItems()}
                                {isAdmin && (
                                    <NavMenuItem
                                        icon={<SettingsIcon />}
                                        text={'Settings'}
                                        onClick={() => {
                                            window.location.href = '/settings';
                                        }}
                                    />
                                )}
                                <NavMenuItem
                                    icon={<Logout />}
                                    text={'Logout'}
                                    onClick={doLogout}
                                />
                            </Menu>
                        </>
                    ) : (
                        <>
                            {mobileView ? (
                                <>
                                    <IconButton
                                        onClick={handleMenu}
                                        color='inherit'
                                    >
                                        <MenuIcon />
                                    </IconButton>
                                    <Menu
                                        id='loggedInMenuMobile'
                                        anchorEl={anchorEl}
                                        anchorOrigin={{
                                            vertical: 'top',
                                            horizontal: 'right',
                                        }}
                                        keepMounted
                                        transformOrigin={{
                                            vertical: 'top',
                                            horizontal: 'right',
                                        }}
                                        open={Boolean(anchorEl)}
                                        onClose={handleClose}
                                    >
                                        <NavMenuItem
                                            icon={<LoginOutlined />}
                                            text={'Login'}
                                            onClick={() => {
                                                window.location.href = '/login';
                                            }}
                                        />
                                        {renderMenuItems()}
                                    </Menu>
                                </>
                            ) : (
                                <Link
                                    href='/login'
                                    color='inherit'
                                    underline='none'
                                >
                                    <Button variant='outlined' color='inherit'>
                                        Login
                                    </Button>
                                </Link>
                            )}
                        </>
                    )}
                </Toolbar>
            </AppBar>
        </Box>
    );
}
