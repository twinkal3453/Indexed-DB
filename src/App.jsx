import React, { useEffect, useRef } from "react";
import "./App.css";
import Mainmenu from "./components/Mainmenu";
import Appointment from "./routes/Appointment";
import Ask from "./routes/Ask";
import Test from "./routes/Test";
import Treat from "./routes/Treat";
import Consult from "./routes/Consult";
import { Routes, Route, useLocation } from "react-router-dom";
import {
  addRoute,
  updateRoute,
  getRoute,
  getAllRoutes,
  partialUpdateRoute,
} from "./utils/indexedDB";

function App() {
  const location = useLocation();
  const didRun = useRef(false);

  // Callback for Storing the data to sessionStorage;
  const handleGetMaster = async () => {
    const allRoutesDatas = await getAllRoutes();
    const isMaster = allRoutesDatas.some((item) => item.master === true);
    return isMaster ? false : true;
  };

  const handleGetRoute = async () => {
    let UUID = "";

    // Get the list of all routes
    const routesList = await getAllRoutes();
    // Checking that if there is any route in the DB which isActive is false
    const foundRoute = routesList.find((item) => item.isActive === false);

    console.log("Line 42 foundRoute", foundRoute);

    if (foundRoute) {
      UUID = foundRoute.id;
    } else {
      UUID = self.crypto.randomUUID();
    }

    const modifiedRouteObject = {
      id: UUID,
      name: location.pathname,
      isActive: true,
      master: await handleGetMaster(),
    };

    if (!sessionStorage.getItem("UUID")) {
      sessionStorage.setItem("UUID", UUID);
      foundRoute
        ? await updateRoute(modifiedRouteObject)
        : await addRoute(modifiedRouteObject);

      const TabLists = await getAllRoutes();
      TabLists.filter((item) => item.isActive === false).forEach((item) => {
        const newWindow = window.open(item.name, "_blank");

        // Check if the window opened successfully (not blocked by the browser)
        if (newWindow) {
          // Once the new window is loaded, assign data to its sessionStorage
          newWindow.onload = function () {
            newWindow.sessionStorage.setItem("UUID", item.id);
          };
        } else {
          console.log("The new window was blocked by the browser.");
        }
      });
    }
  };

  // Responsible to Add route and it's detail to Indexed DB and make isActive false if existing tab closed.
  useEffect(() => {
    if (!didRun.current) {
      handleGetRoute();
      didRun.current = true;
    }

    return () => {
      console.log("Vanishing...");
    };
  }, []);

  // Triggers when route changes, it is responsible to change the routes of the exixting tab id.
  useEffect(() => {
    const handleChangeRoute = async () => {
      const sessionData = sessionStorage.getItem("UUID");

      if (sessionData) {
        const sessionData = sessionStorage.getItem("UUID");
        const objValue = await getRoute(sessionData);
        objValue.name = location.pathname;
        objValue.isActive = true;
        await partialUpdateRoute(objValue);
      }
    };

    // Make route inactive if Tab is closed.
    /**
     * The function `handleIsActive` retrieves a UUID from local storage, updates the `isActive` and
     * `master` properties of an object fetched using the UUID, and then performs a partial update on
     * the object.
     */
    const handleIsActive = async () => {
      // getting the UUID from the local storage.
      const sessionData = sessionStorage.getItem("UUID");
      const objValue = await getRoute(sessionData);
      objValue.isActive = false;
      objValue.master = false;
      await partialUpdateRoute(objValue);

      // if master page is closed then this functionality will make another one page master
      const allRoutes = await getAllRoutes();
      const activepages = allRoutes.filter((item) => item.isActive === true);
      if (activepages.length > 0) {
        let masterPage = activepages[0];
        masterPage.master = true;
        await partialUpdateRoute(masterPage);
      }
    };

    handleChangeRoute();

    window.addEventListener("beforeunload", handleIsActive);

    return () => {
      console.log("Closing...");

      window.removeEventListener("beforeunload", handleIsActive);
    };
  }, [location.pathname]);

  return (
    <div>
      <Mainmenu />
      <Routes>
        <Route path="/" element={<Appointment />} />
        <Route path="/ask" element={<Ask />} />
        <Route path="/test" element={<Test />} />
        <Route path="/treat" element={<Treat />} />
        <Route path="/consult" element={<Consult />} />
      </Routes>
    </div>
  );
}

export default App;
