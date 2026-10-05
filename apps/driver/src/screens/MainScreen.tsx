import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { BackHandler, StyleSheet, View } from "react-native";
import { colors } from "../theme";
import { useSession } from "../session";
import { NavContext, type Nav, type Route } from "../navigation";
import { TabBar, type Tab } from "../components/TabBar";
import { HomeScreen } from "./HomeScreen";
import { TripsScreen } from "./TripsScreen";
import { ChatsScreen } from "./ChatsScreen";
import { ChatThreadScreen } from "./ChatThreadScreen";
import { ProfileScreen } from "./ProfileScreen";
import { TruckScreen } from "./TruckScreen";
import { TripDetailScreen } from "./TripDetailScreen";
import { EditProfileScreen } from "./EditProfileScreen";
import { PairScreen } from "./PairScreen";

// Tabs stay mounted once opened (scroll position and loaded data survive a
// tab switch); a tab nobody has opened yet isn't rendered at all.
function TabPane({ visible, mounted, children }: { visible: boolean; mounted: boolean; children: ReactNode }) {
  if (!mounted) return null;
  return <View style={[StyleSheet.absoluteFill, !visible && styles.hidden]}>{children}</View>;
}

export function MainScreen() {
  const { unreadChats } = useSession();
  const [tab, setTab] = useState<Tab>("home");
  const [visited, setVisited] = useState<Set<Tab>>(() => new Set(["home"]));
  const [stack, setStack] = useState<Route[]>([]);
  const stackRef = useRef(stack);
  stackRef.current = stack;
  const tabRef = useRef(tab);
  tabRef.current = tab;

  const selectTab = useCallback((next: Tab) => {
    setVisited((current) => (current.has(next) ? current : new Set(current).add(next)));
    setTab(next);
  }, []);

  const nav = useMemo<Nav>(
    () => ({
      push: (route) => setStack((current) => [...current, route]),
      pop: () => setStack((current) => current.slice(0, -1)),
      setTab: selectTab,
    }),
    [selectTab]
  );

  useEffect(() => {
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      if (stackRef.current.length > 0) {
        nav.pop();
        return true;
      }
      if (tabRef.current !== "home") {
        selectTab("home");
        return true;
      }
      return false;
    });
    return () => subscription.remove();
  }, [nav, selectTab]);

  const top = stack.length > 0 ? stack[stack.length - 1] : null;

  return (
    <NavContext.Provider value={nav}>
      <View style={styles.fill}>
        <View style={styles.fill}>
          <TabPane visible={tab === "home"} mounted>
            <HomeScreen />
          </TabPane>
          <TabPane visible={tab === "trips"} mounted={visited.has("trips")}>
            <TripsScreen />
          </TabPane>
          <TabPane visible={tab === "chat"} mounted={visited.has("chat")}>
            {/* Only polls while it is the visible tab and nothing is pushed over it. */}
            <ChatsScreen active={tab === "chat" && !top} />
          </TabPane>
          <TabPane visible={tab === "profile"} mounted={visited.has("profile")}>
            <ProfileScreen />
          </TabPane>
        </View>
        <TabBar tab={tab} onChange={selectTab} badges={{ chat: unreadChats }} />
        {top ? <View style={StyleSheet.absoluteFill}>{renderRoute(top, nav)}</View> : null}
      </View>
    </NavContext.Provider>
  );
}

function renderRoute(route: Route, nav: Nav) {
  switch (route.name) {
    case "trip":
      return <TripDetailScreen tripId={route.tripId} onBack={nav.pop} />;
    case "editProfile":
      return <EditProfileScreen onBack={nav.pop} />;
    case "truck":
      return <TruckScreen onBack={nav.pop} />;
    case "thread":
      return (
        <ChatThreadScreen
          operatorId={route.operatorId}
          title={route.title}
          subtitle={route.subtitle}
          phone={route.phone}
          onBack={nav.pop}
        />
      );
    case "attachTrip":
      return (
        <PairScreen
          onBack={() => {
            nav.pop();
            nav.setTab("home");
          }}
        />
      );
  }
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.bg },
  hidden: { display: "none" },
});
