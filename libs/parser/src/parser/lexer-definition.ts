import { TokenType, IMultiModeLexerDefinition } from 'chevrotain';
import {
  WhiteSpace,
  Lookup,
  NumberLiteral,
  StringLiteral,
  NestedDblQuoteStringLiteral,
  SingleQuoteStringLiteral,
  LParen,
  RParen,
  LSquare,
  RSquare,
  TernaryOper,
  Dot,
  Comma,
  Colon,
  True,
  False,
  Nil,
  Null,
  Nullable,
  LogicalAnd,
  MulOp,
  AddOp,
  RelOp,
  LogicalOr,
  BinaryOp,
  ResolverIdentifier,
  IdentifierName,
  StringTemplateOpen,
  InlineObjectExprOpen,
  DblQuoteStringLiteral,
  LCurly,
  RCurly,
  StringTemplateClose,
  InlineObjectExprClose,
} from './tokens';

const objectExpressionMode = (close: TokenType) => {
  return [
    WhiteSpace,
    Lookup,
    NumberLiteral,
    StringLiteral,
    NestedDblQuoteStringLiteral,
    SingleQuoteStringLiteral,
    close,
    LParen,
    RParen,
    LSquare,
    RSquare,
    TernaryOper,
    Dot,
    Comma,
    Colon,
    True,
    False,
    Nil,
    Null,
    Nullable,
    LogicalAnd,
    MulOp,
    AddOp,
    RelOp,
    LogicalOr,
    BinaryOp,
    ResolverIdentifier,
    IdentifierName,
  ];
};
export const lexerDefinition: IMultiModeLexerDefinition = {
  modes: {
    default: [
      WhiteSpace,
      Lookup,
      NumberLiteral,
      StringTemplateOpen,
      InlineObjectExprOpen,
      StringLiteral,
      DblQuoteStringLiteral,
      SingleQuoteStringLiteral,
      LParen,
      RParen,
      LCurly,
      RCurly,
      LSquare,
      RSquare,
      TernaryOper,
      Dot,
      Comma,
      Colon,
      True,
      False,
      Null,
      Nil,
      Nullable,
      LogicalAnd,
      MulOp,
      AddOp,
      RelOp,
      LogicalOr,
      BinaryOp,
      ResolverIdentifier,
      IdentifierName,
    ],
    string_template: objectExpressionMode(StringTemplateClose),
    inline_object_expr: objectExpressionMode(InlineObjectExprClose),
  },
  defaultMode: 'default',
};