import { useReducer, useEffect } from 'react';
import { PluginType, PluginIncludeType, GrafanaPlugin, PluginMeta } from '@grafana/data';
import { api } from '../api';
import { loadPlugin } from '../../PluginPage';
import { getCatalogPluginDetails, isOrgAdmin } from '../helpers';
import { ActionTypes, CatalogPluginDetails, PluginDetailsActions, PluginDetailsState, PluginTabLabels } from '../types';

type Tab = {
  label: PluginTabLabels;
};

const defaultTabs: Tab[] = [{ label: PluginTabLabels.OVERVIEW }, { label: PluginTabLabels.VERSIONS }];

const initialState = {
  hasInstalledPanel: false,
  hasUpdate: false,
  isInstalled: false,
  isInflight: false,
  loading: false,
  error: undefined,
  plugin: undefined,
  pluginConfig: undefined,
  tabs: defaultTabs,
  activeTab: 0,
};

const reducer = (state: PluginDetailsState, action: PluginDetailsActions) => {
  switch (action.type) {
    case ActionTypes.LOADING: {
      return { ...state, loading: true };
    }
    case ActionTypes.INFLIGHT: {
      return { ...state, isInflight: true };
    }
    case ActionTypes.ERROR: {
      return { ...state, loading: false, error: action.payload };
    }
    case ActionTypes.FETCHED_PLUGIN: {
      return {
        ...state,
        loading: false,
        plugin: action.payload,
        isInstalled: action.payload.isInstalled,
        hasUpdate: action.payload.hasUpdate,
      };
    }
    case ActionTypes.FETCHED_PLUGIN_CONFIG: {
      return {
        ...state,
        loading: false,
        pluginConfig: action.payload,
      };
    }
    case ActionTypes.UPDATE_TABS: {
      return {
        ...state,
        tabs: action.payload,
      };
    }
    case ActionTypes.INSTALLED: {
      return {
        ...state,
        isInflight: false,
        isInstalled: true,
        hasInstalledPanel: action.payload,
      };
    }
    case ActionTypes.UNINSTALLED: {
      return {
        ...state,
        isInflight: false,
        isInstalled: false,
      };
    }
    case ActionTypes.UPDATED: {
      return {
        ...state,
        hasUpdate: false,
        isInflight: false,
      };
    }
    case ActionTypes.SET_ACTIVE_TAB: {
      return {
        ...state,
        activeTab: action.payload,
      };
    }
  }
};

const pluginCache: Record<string, CatalogPluginDetails> = {};
const pluginConfigCache: Record<string, GrafanaPlugin<PluginMeta<{}>>> = {};

export const usePluginDetails = (id: string) => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const userCanConfigurePlugins = isOrgAdmin();

  useEffect(() => {
    const fetchPlugin = async () => {
      dispatch({ type: ActionTypes.LOADING });
      try {
        let plugin;

        if (pluginCache[id]) {
          plugin = pluginCache[id];
        } else {
          const value = await api.getPlugin(id);
          plugin = getCatalogPluginDetails(value?.local, value?.remote, value?.remoteVersions);
          pluginCache[id] = plugin;
        }

        dispatch({ type: ActionTypes.FETCHED_PLUGIN, payload: plugin });
      } catch (error) {
        dispatch({ type: ActionTypes.ERROR, payload: error });
      }
    };
    fetchPlugin();
  }, [id]);

  useEffect(() => {
    const fetchPluginConfig = async () => {
      if (state.isInstalled) {
        dispatch({ type: ActionTypes.LOADING });
        try {
          let pluginConfig;

          if (pluginConfigCache[id]) {
            pluginConfig = pluginConfigCache[id];
          } else {
            pluginConfig = await loadPlugin(id);
            pluginConfigCache[id] = pluginConfig;
          }

          dispatch({ type: ActionTypes.FETCHED_PLUGIN_CONFIG, payload: pluginConfig });
        } catch (error) {
          dispatch({ type: ActionTypes.ERROR, payload: error });
        }
      } else {
        // reset tabs
        dispatch({ type: ActionTypes.FETCHED_PLUGIN_CONFIG, payload: undefined });
        dispatch({ type: ActionTypes.SET_ACTIVE_TAB, payload: 0 });
      }
    };
    fetchPluginConfig();
  }, [state.isInstalled, id]);

  useEffect(() => {
    const pluginConfig = state.pluginConfig;
    const tabs: Tab[] = [...defaultTabs];

    if (pluginConfig && userCanConfigurePlugins) {
      if (pluginConfig.meta.type === PluginType.app) {
        if (pluginConfig.angularConfigCtrl) {
          tabs.push({
            label: PluginTabLabels.CONFIG,
          });
        }

        // Configuration pages with custom labels
        if (pluginConfig.configPages) {
          for (const page of pluginConfig.configPages) {
            tabs.push({
              label: page.title as PluginTabLabels,
            });
          }
        }

        if (pluginConfig.meta.includes?.find((include) => include.type === PluginIncludeType.dashboard)) {
          tabs.push({
            label: PluginTabLabels.DASHBOARDS,
          });
        }
      }
    }
    dispatch({ type: ActionTypes.UPDATE_TABS, payload: tabs });
  }, [userCanConfigurePlugins, state.pluginConfig, id]);

  return { state, dispatch };
};
