// Libraries
import React, { PureComponent } from 'react';

// Types
import { StoreState, ExploreId } from 'app/types';
import { connect, ConnectedProps } from 'react-redux';
import { hot } from 'react-hot-loader';
import { QueryEditorRows } from '../query/components/QueryEditorRows';
import { runQueries, changeQueries } from './state/query';
import { getDatasourceSrv } from '../plugins/datasource_srv';
import { DataQuery } from '@grafana/data';

interface OwnProps {
  exploreId: ExploreId;
}

type QueryRowsProps = OwnProps & ConnectedProps<typeof connector>;

class QueryRows extends PureComponent<QueryRowsProps> {
  onRunQuery = () => {
    const { exploreId } = this.props;
    this.props.runQueries(exploreId);
  };

  onChange = (queries: DataQuery[], override?: boolean) => {
    const { exploreId } = this.props;
    this.props.changeQueries(exploreId, queries);
    // if (query && !override && datasourceInstance?.getHighlighterExpression && index === 0) {
    //   // Live preview of log search matches. Only use on first row for now
    //   this.updateLogsHighlights(query);
    // }
    this.onRunQuery();
  };

  onAddQuery = (query: DataQuery) => {
    const { queries, exploreId } = this.props;

    this.props.changeQueries(exploreId, [...queries, query]);
    this.onRunQuery();
  };

  render() {
    const { queries, datasourceInstance } = this.props;
    const dsSettings = getDatasourceSrv().getInstanceSettings(datasourceInstance?.name)!;

    return (
      <>
        {/* TODO:  DatasourceCheatsheet for each row*/}
        {/* const DatasourceCheatsheet = datasourceInstance.components?.QueryEditorHelp;
            return (
              <>
                {QueryEditor}
                {DatasourceCheatsheet && (
                  <HelpToggle>
                    <DatasourceCheatsheet onClickExample={(query) => this.onChange(query)} datasource={datasourceInstance!} />
                  </HelpToggle>
                )}
              </>
            ); 
        */}
        <QueryEditorRows
          // FIXME: can data be optional? the component doesn't break without it and it looks unnecessary in explore
          // data={{}}
          queries={queries}
          onRunQueries={this.onRunQuery}
          dsSettings={dsSettings}
          onQueriesChange={this.onChange}
          onAddQuery={this.onAddQuery}
        />
        {/* <div className={className}>
          {queryKeys.map((key, index) => {
            return <QueryRow key={key} exploreId={exploreId} index={index} />;
          })}
        </div> */}
      </>
    );
  }
}

function mapStateToProps(state: StoreState, { exploreId }: OwnProps) {
  const { datasourceInstance, queries, range } = state.explore[exploreId]!;

  return {
    queries,
    range,
    datasourceInstance,
  };
}

const mapDispatchToProps = {
  changeQueries,
  // highlightLogsExpressionAction,
  // modifyQueries,
  runQueries,
};

const connector = connect(mapStateToProps, mapDispatchToProps);

export default hot(module)(connector(QueryRows));
