import { Outlet } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import ToastViewport from '../common/ToastViewport';
import './MainLayout.css';

export default function MainLayout() {
    return (
        <div className="main-layout">
            <Header />
            <main className="main-layout__content">
                <Outlet />
            </main>
            <Footer />
            <ToastViewport />
        </div>
    );
}
