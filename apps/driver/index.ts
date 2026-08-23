import { registerLocationTask } from "./src/location";
import { registerRootComponent } from "expo";
import App from "./App";

// The location task must be defined before the app tree loads.
registerLocationTask();
registerRootComponent(App);
