import {Route, Routes} from 'react-router-dom';
import Repositories from "../screens/Repositories.jsx";
import Settings from "../screens/Settings.jsx";

const RouteSwitcher = () => {
    return (
        <Routes>
            <Route path="/" element={<Repositories/>}/>
            <Route path="/repos" element={<Repositories/>}/>
            <Route path="/settings" element={<Settings/>}/>
        </Routes>
    )
};

export default RouteSwitcher;
